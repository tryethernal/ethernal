/**
 * @fileoverview Infrastructure health check job.
 * Monitors Redis, PostgreSQL, and Fly API health on a 60s schedule.
 * Creates OpsGenie alerts for degraded services and triggers auto-remediation
 * via GitHub Actions for P1 issues.
 * @module jobs/infraHealthCheck
 */

const redis = require('../lib/redis');
const logger = require('../lib/logger');
const { createIncident } = require('../lib/opsgenie');
const {
    getNodeEnv,
    getGithubToken,
    isReplicationMonitoringEnabled,
    getReplicationLagAlertSeconds,
    getWalArchiveStaleAlertSeconds
} = require('../lib/env');
const { withTimeout } = require('../lib/utils');
const axios = require('axios');

const REDIS_MEMORY_WARNING_THRESHOLD = 0.80;
const REDIS_MEMORY_CRITICAL_THRESHOLD = 0.95;
const CHECK_TIMEOUT_MS = 10000;
const REMEDIATION_COOLDOWN_SECONDS = 300;
const REMEDIATION_HOURLY_LIMIT = 10;
const REMEDIATION_REPEAT_WINDOW_SECONDS = 7200;

/** In-memory fallback cooldown per alert type when Redis is unavailable */
const inMemoryLastDispatch = {};

/**
 * Checks Redis connectivity and memory usage.
 * @returns {Promise<Object>} Redis health status
 */
async function checkRedis() {
    const result = { service: 'redis', status: 'ok', latencyMs: 0, memoryPercent: null };
    const start = Date.now();

    try {
        await withTimeout(redis.ping(), CHECK_TIMEOUT_MS);
        result.latencyMs = Date.now() - start;
    } catch (error) {
        result.status = 'unhealthy';
        result.error = error.message;
        return result;
    }

    try {
        const info = await withTimeout(redis.info('memory'), CHECK_TIMEOUT_MS);
        const usedMatch = info.match(/used_memory:(\d+)/);
        const maxMatch = info.match(/maxmemory:(\d+)/);

        if (usedMatch && maxMatch && parseInt(maxMatch[1]) > 0) {
            const used = parseInt(usedMatch[1]);
            const max = parseInt(maxMatch[1]);
            result.memoryPercent = parseFloat(((used / max) * 100).toFixed(1));

            if (result.memoryPercent >= REDIS_MEMORY_CRITICAL_THRESHOLD * 100) {
                result.status = 'critical';
            } else if (result.memoryPercent >= REDIS_MEMORY_WARNING_THRESHOLD * 100) {
                result.status = 'warning';
            }
        }
    } catch (error) {
        logger.warn('Failed to get Redis memory info', { error: error.message });
    }

    return result;
}

/**
 * Checks PostgreSQL connectivity via Sequelize.
 * @returns {Promise<Object>} PostgreSQL health status
 */
async function checkPostgres() {
    const result = { service: 'postgres', status: 'ok', latencyMs: 0 };
    const start = Date.now();

    try {
        const { sequelize } = require('../models');
        await withTimeout(sequelize.query('SELECT 1'), CHECK_TIMEOUT_MS);
        result.latencyMs = Date.now() - start;
    } catch (error) {
        result.status = 'unhealthy';
        result.error = error.message;
    }

    return result;
}

/**
 * Checks streaming replication and WAL archiving health.
 *
 * Both are read from the database this process is already connected to, so no
 * extra connection or credential is needed. Everything is observed from the
 * PRIMARY: `pg_stat_replication` lists the standbys attached to it, and
 * `pg_stat_archiver` reports its own archiving.
 *
 * If this process is connected to a standby (`pg_is_in_recovery()`), both views
 * are empty or meaningless, so the check reports `skipped` rather than
 * inventing a failure. That matters because a false "no standby attached" alarm
 * would be indistinguishable from the real thing.
 *
 * @returns {Promise<Object>} Replication health status
 */
async function checkReplication() {
    const result = {
        service: 'replication',
        status: 'ok',
        standbyCount: null,
        maxReplayLagSeconds: null,
        walArchiveAgeSeconds: null,
        walArchiveFailedCount: null
    };

    if (!isReplicationMonitoringEnabled()) {
        result.status = 'skipped';
        result.reason = 'disabled by REPLICATION_MONITORING_ENABLED=false';
        return result;
    }

    try {
        const { sequelize } = require('../models');

        const [[row]] = await withTimeout(sequelize.query(`
            SELECT
                pg_is_in_recovery() AS in_recovery,
                (SELECT count(*) FROM pg_stat_replication) AS standby_count,
                (SELECT COALESCE(MAX(EXTRACT(EPOCH FROM replay_lag)), 0)
                   FROM pg_stat_replication) AS max_replay_lag_seconds,
                (SELECT EXTRACT(EPOCH FROM (now() - last_archived_time))
                   FROM pg_stat_archiver) AS wal_archive_age_seconds,
                (SELECT failed_count FROM pg_stat_archiver) AS wal_archive_failed_count
        `), CHECK_TIMEOUT_MS);

        if (row.in_recovery) {
            result.status = 'skipped';
            result.reason = 'connected to a standby, not a primary';
            return result;
        }

        result.standbyCount = parseInt(row.standby_count, 10);
        result.maxReplayLagSeconds = row.max_replay_lag_seconds === null
            ? null
            : parseFloat(row.max_replay_lag_seconds);
        result.walArchiveAgeSeconds = row.wal_archive_age_seconds === null
            ? null
            : parseFloat(row.wal_archive_age_seconds);
        result.walArchiveFailedCount = row.wal_archive_failed_count === null
            ? null
            : parseInt(row.wal_archive_failed_count, 10);

        // A standby that has silently gone away means there is no HA and no
        // failover target — the single most important thing to notice here.
        if (result.standbyCount === 0) {
            result.status = 'no-standby';
            return result;
        }

        if (result.maxReplayLagSeconds !== null
            && result.maxReplayLagSeconds > getReplicationLagAlertSeconds()) {
            result.status = 'lagging';
            return result;
        }

        // A null archive age means nothing has EVER been archived, which on a
        // primary with archiving configured is itself a failure.
        if (result.walArchiveAgeSeconds === null
            || result.walArchiveAgeSeconds > getWalArchiveStaleAlertSeconds()) {
            result.status = 'archive-stale';
            return result;
        }
    } catch (error) {
        result.status = 'unhealthy';
        result.error = error.message;
    }

    return result;
}

/**
 * Checks rate limits before triggering remediation.
 * Three layers: cooldown, hourly cap, and fail-fast escalation for repeated alerts.
 * @param {string} alertType - The type of alert for dedup tracking
 * @returns {Promise<{allowed: boolean, reason: string|null, escalate: boolean}>}
 */
async function checkRemediationRateLimit(alertType) {
    // Layer 1: Hourly cap (atomic INCR+EXPIRE via Lua to avoid race condition)
    const hourlyKey = 'infra:remediation:hourly';
    const hourlyCount = await withTimeout(redis.eval(
        "local count = redis.call('INCR', KEYS[1]) if count == 1 then redis.call('EXPIRE', KEYS[1], 3600) end return count",
        1, hourlyKey
    ), CHECK_TIMEOUT_MS);
    if (hourlyCount > REMEDIATION_HOURLY_LIMIT) {
        return { allowed: false, reason: `hourly limit reached (${hourlyCount}/${REMEDIATION_HOURLY_LIMIT})`, escalate: false };
    }

    // Layer 2: Per-alert dedup — same alert type within 2 hours (fail-fast escalation)
    const lastKey = `infra:remediation:last:${alertType}`;
    const lastTrigger = await withTimeout(redis.get(lastKey), CHECK_TIMEOUT_MS);
    if (lastTrigger) {
        return { allowed: false, reason: `same alert type triggered recently`, escalate: true };
    }

    // Layer 3: Global cooldown (5 min between any triggers) — set only after all checks pass
    const cooldownKey = 'infra:remediation:cooldown';
    const cooldownSet = await withTimeout(redis.set(cooldownKey, '1', 'EX', REMEDIATION_COOLDOWN_SECONDS, 'NX'), CHECK_TIMEOUT_MS);
    if (!cooldownSet) {
        return { allowed: false, reason: 'cooldown active', escalate: false };
    }

    return { allowed: true, reason: null, escalate: false };
}

/**
 * Creates or comments on a GitHub issue for fail-fast escalation when auto-remediation is skipped.
 * Searches for an existing open issue with the same alert type first to avoid duplicates.
 * @param {string} alertType - The alert type
 * @param {string} details - Alert details
 */
async function createEscalationIssue(alertType, details) {
    const token = getGithubToken();
    if (!token) return;

    const headers = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json'
    };

    try {
        // Search for an existing open issue with the same alert type
        const searchTitle = `[Infra Alert] Repeated ${alertType}`;
        const searchResponse = await axios.get(
            `https://api.github.com/search/issues?q=${encodeURIComponent(`repo:tryethernal/ethernal is:issue is:open in:title "${searchTitle}"`)}`,
            { headers }
        );

        const existingIssue = searchResponse.data.items && searchResponse.data.items[0];

        if (existingIssue) {
            // Comment on the existing issue instead of creating a duplicate
            await axios.post(
                `https://api.github.com/repos/tryethernal/ethernal/issues/${existingIssue.number}/comments`,
                {
                    body: `Alert still firing at ${new Date().toISOString()}.\n\n**Details:**\n${details}`
                },
                { headers }
            );
            logger.info('Commented on existing escalation issue', { alertType, issueNumber: existingIssue.number });
        } else {
            // Create a new issue
            await axios.post(
                'https://api.github.com/repos/tryethernal/ethernal/issues',
                {
                    title: `[Infra Alert] Repeated ${alertType} — needs human intervention`,
                    body: `## Auto-Remediation Skipped (Fail-Fast Escalation)\n\nThe same alert type \`${alertType}\` triggered repeatedly. Auto-remediation was skipped to avoid loops.\n\n**Details:**\n${details}\n\n**Timestamp:** ${new Date().toISOString()}\n\ncc @antoinedc`,
                    labels: ['infra-alert', 'needs-human']
                },
                { headers }
            );
            logger.info('Created escalation issue', { alertType });
        }
    } catch (error) {
        logger.error('Failed to create/update escalation issue', { error: error.message });
    }
}

/**
 * Triggers the infra-auto-remediation GitHub Actions workflow.
 * @param {string} alertType - Type of infrastructure alert
 * @param {string} details - Alert details for the investigation
 */
async function triggerRemediation(alertType, details) {
    const token = getGithubToken();
    if (!token) {
        logger.warn('GITHUB_TOKEN not set, skipping auto-remediation trigger');
        return;
    }

    if (getNodeEnv() === 'development') {
        logger.info('Development mode — skipping remediation trigger', { alertType, details });
        return;
    }

    let rateLimit;
    try {
        rateLimit = await checkRemediationRateLimit(alertType);
    } catch (error) {
        // Rate limit check uses Redis — if Redis is down, use in-memory cooldown to prevent dispatch flooding
        const now = Date.now();
        const lastDispatch = inMemoryLastDispatch[alertType] || 0;
        if (now - lastDispatch < REMEDIATION_COOLDOWN_SECONDS * 1000) {
            logger.warn('Rate limit check failed, in-memory cooldown active', { alertType });
            return;
        }
        inMemoryLastDispatch[alertType] = now;
        logger.warn('Rate limit check failed, proceeding with remediation (in-memory dedup)', { alertType, error: error.message });
        rateLimit = { allowed: true, reason: null, escalate: false };
    }

    if (!rateLimit.allowed) {
        logger.info('Remediation rate-limited', { alertType, reason: rateLimit.reason, escalate: rateLimit.escalate });

        if (rateLimit.escalate) {
            await createEscalationIssue(alertType, details);
        }
        return;
    }

    try {
        await axios.post(
            'https://api.github.com/repos/tryethernal/ethernal/actions/workflows/infra-auto-remediation.yml/dispatches',
            {
                ref: 'develop',
                inputs: {
                    alert_type: alertType,
                    alert_details: details
                }
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/vnd.github.v3+json'
                }
            }
        );

        logger.info('Triggered auto-remediation workflow', { alertType });

        // Set dedup key separately — a Redis failure here shouldn't mask the successful dispatch
        try {
            const lastKey = `infra:remediation:last:${alertType}`;
            await redis.set(lastKey, Date.now().toString(), 'EX', REMEDIATION_REPEAT_WINDOW_SECONDS);
        } catch (dedupError) {
            logger.warn('Failed to set dedup key after successful dispatch', { alertType, error: dedupError.message });
        }
    } catch (error) {
        logger.error('Failed to trigger remediation workflow', { error: error.message, alertType });
    }
}

module.exports = async () => {
    let incidentCreated = false;

    // Run all checks in parallel — each is independent
    const [redisResult, postgresResult, replicationResult] = await Promise.all([
        checkRedis().catch(error => ({ service: 'redis', status: 'unhealthy', error: error.message })),
        checkPostgres().catch(error => ({ service: 'postgres', status: 'unhealthy', error: error.message })),
        checkReplication().catch(error => ({ service: 'replication', status: 'unhealthy', error: error.message }))
    ]);

    logger.info('Infrastructure health check', {
        redis: redisResult,
        postgres: postgresResult,
        replication: replicationResult
    });

    // Redis memory warnings
    if (redisResult.status === 'warning') {
        await createIncident(
            'Redis memory usage high',
            `Redis memory at ${redisResult.memoryPercent}% (warning threshold: ${REDIS_MEMORY_WARNING_THRESHOLD * 100}%)`,
            'P2',
            { alias: 'infra-redis-memory-warning' }
        );
        incidentCreated = true;
    }

    // Redis memory critical
    if (redisResult.status === 'critical') {
        const details = `Redis memory at ${redisResult.memoryPercent}% (critical threshold: ${REDIS_MEMORY_CRITICAL_THRESHOLD * 100}%)`;
        await createIncident('Redis memory critical', details, 'P1', { alias: 'infra-redis-memory-critical' });
        await triggerRemediation('redis-memory-critical', details);
        incidentCreated = true;
    }

    // Redis connectivity failure
    if (redisResult.status === 'unhealthy' && redisResult.error) {
        // OpsGenie is private — safe to include raw error for diagnosis
        const privateDetails = `Redis connectivity failed: ${redisResult.error}`;
        await createIncident('Redis connectivity failure', privateDetails, 'P1', { alias: 'infra-redis-connectivity' });
        // Remediation triggers public GitHub issues — use generic message to avoid credential leaks
        await triggerRemediation('redis-connectivity', 'Redis connectivity check failed');
        incidentCreated = true;
    }

    // PostgreSQL connectivity failure
    if (postgresResult.status === 'unhealthy') {
        const privateDetails = `PostgreSQL connectivity failed: ${postgresResult.error}`;
        await createIncident('PostgreSQL connectivity failure', privateDetails, 'P1', { alias: 'infra-postgres-connectivity' });
        await triggerRemediation('postgres-connectivity', 'PostgreSQL connectivity check failed');
        incidentCreated = true;
    }

    // No standby attached to the primary — there is no HA and nothing to fail
    // over to. Deliberately NOT auto-remediated: rebuilding a standby is a
    // ~70 minute reseed and a decision for a human, not a workflow.
    if (replicationResult.status === 'no-standby') {
        await createIncident(
            'PostgreSQL has no streaming standby',
            'No standby is connected to the primary. The cluster has no failover target '
                + 'until a standby is rebuilt (reseed takes ~70 min).',
            'P1',
            { alias: 'infra-postgres-no-standby' }
        );
        incidentCreated = true;
    }

    // Standby attached but falling behind: failover would lose more than the
    // usual second or two, and it is an early warning of a struggling replica.
    if (replicationResult.status === 'lagging') {
        await createIncident(
            'PostgreSQL replication lag high',
            `Standby replay lag is ${Math.round(replicationResult.maxReplayLagSeconds)}s `
                + `(threshold ${getReplicationLagAlertSeconds()}s). Promoting now would lose `
                + 'roughly that much data.',
            'P2',
            { alias: 'infra-postgres-replication-lag' }
        );
        incidentCreated = true;
    }

    // WAL archiving stalled. This is the point-in-time recovery path: while it
    // is broken, every base backup is only restorable to the moment archiving
    // stopped, and that gap widens every minute.
    if (replicationResult.status === 'archive-stale') {
        const age = replicationResult.walArchiveAgeSeconds;
        await createIncident(
            'PostgreSQL WAL archiving stalled',
            age === null
                ? 'No WAL segment has ever been archived on this primary.'
                : `Last WAL archive was ${Math.round(age)}s ago (threshold `
                    + `${getWalArchiveStaleAlertSeconds()}s, archive_timeout is 300s). `
                    + `Archiver failed_count is ${replicationResult.walArchiveFailedCount}. `
                    + 'Point-in-time recovery is frozen at the last archived segment.',
            'P1',
            { alias: 'infra-postgres-wal-archive-stale' }
        );
        incidentCreated = true;
    }

    // The check itself could not run (e.g. permissions, connectivity). Report it
    // rather than letting monitoring fail silently — a check that never fires
    // looks exactly like a healthy system.
    if (replicationResult.status === 'unhealthy') {
        await createIncident(
            'PostgreSQL replication check failed',
            `Replication/archiving health check could not run: ${replicationResult.error}`,
            'P2',
            { alias: 'infra-postgres-replication-check-failed' }
        );
        incidentCreated = true;
    }

    return {
        incidentCreated,
        redis: redisResult,
        postgres: postgresResult,
        replication: replicationResult
    };
};
