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
const { getNodeEnv, getGithubToken } = require('../lib/env');
const axios = require('axios');

const REDIS_MEMORY_WARNING_THRESHOLD = 0.80;
const REDIS_MEMORY_CRITICAL_THRESHOLD = 0.95;
const CHECK_TIMEOUT_MS = 5000;
const REMEDIATION_COOLDOWN_SECONDS = 300;
const REMEDIATION_HOURLY_LIMIT = 10;
const REMEDIATION_REPEAT_WINDOW_SECONDS = 1800;

/**
 * Checks Redis connectivity and memory usage.
 * @returns {Promise<Object>} Redis health status
 */
const checkRedis = async () => {
    const result = { service: 'redis', status: 'ok', latencyMs: 0, memoryPercent: null };
    const start = Date.now();

    try {
        await Promise.race([
            redis.ping(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Redis ping timeout')), CHECK_TIMEOUT_MS))
        ]);
        result.latencyMs = Date.now() - start;
    } catch (error) {
        result.status = 'unhealthy';
        result.error = error.message;
        return result;
    }

    try {
        const info = await Promise.race([
            redis.info('memory'),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Redis info timeout')), CHECK_TIMEOUT_MS))
        ]);
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
};

/**
 * Checks PostgreSQL connectivity via Sequelize.
 * @returns {Promise<Object>} PostgreSQL health status
 */
const checkPostgres = async () => {
    const result = { service: 'postgres', status: 'ok', latencyMs: 0 };
    const start = Date.now();

    try {
        const { sequelize } = require('../models');
        await Promise.race([
            sequelize.query('SELECT 1'),
            new Promise((_, reject) => setTimeout(() => reject(new Error('PostgreSQL query timeout')), CHECK_TIMEOUT_MS))
        ]);
        result.latencyMs = Date.now() - start;
    } catch (error) {
        result.status = 'unhealthy';
        result.error = error.message;
    }

    return result;
};

/**
 * Checks rate limits before triggering remediation.
 * Three layers: cooldown, hourly cap, and fail-fast escalation for repeated alerts.
 * @param {string} alertType - The type of alert for dedup tracking
 * @returns {Promise<{allowed: boolean, reason: string|null, escalate: boolean}>}
 */
const checkRemediationRateLimit = async (alertType) => {
    // Layer 1: Hourly cap (atomic INCR+EXPIRE via Lua to avoid race condition)
    const hourlyKey = 'infra:remediation:hourly';
    const hourlyCount = await redis.eval(
        "local count = redis.call('INCR', KEYS[1]) if count == 1 then redis.call('EXPIRE', KEYS[1], 3600) end return count",
        1, hourlyKey
    );
    if (hourlyCount > REMEDIATION_HOURLY_LIMIT) {
        return { allowed: false, reason: `hourly limit reached (${hourlyCount}/${REMEDIATION_HOURLY_LIMIT})`, escalate: false };
    }

    // Layer 2: Per-alert dedup — same alert type within 30 min (fail-fast escalation)
    const lastKey = `infra:remediation:last:${alertType}`;
    const lastTrigger = await redis.get(lastKey);
    if (lastTrigger) {
        return { allowed: false, reason: `same alert type triggered recently`, escalate: true };
    }

    // Layer 3: Global cooldown (5 min between any triggers) — set only after all checks pass
    const cooldownKey = 'infra:remediation:cooldown';
    const cooldownSet = await redis.set(cooldownKey, '1', 'EX', REMEDIATION_COOLDOWN_SECONDS, 'NX');
    if (!cooldownSet) {
        return { allowed: false, reason: 'cooldown active', escalate: false };
    }

    return { allowed: true, reason: null, escalate: false };
};

/**
 * Creates a GitHub issue for fail-fast escalation when auto-remediation is skipped.
 * @param {string} alertType - The alert type
 * @param {string} details - Alert details
 */
const createEscalationIssue = async (alertType, details) => {
    const token = getGithubToken();
    if (!token) return;

    try {
        await axios.post(
            'https://api.github.com/repos/tryethernal/ethernal/issues',
            {
                title: `[Infra Alert] Repeated ${alertType} — needs human intervention`,
                body: `## Auto-Remediation Skipped (Fail-Fast Escalation)\n\nThe same alert type \`${alertType}\` triggered twice within 30 minutes. Auto-remediation was skipped to avoid loops.\n\n**Details:**\n${details}\n\n**Timestamp:** ${new Date().toISOString()}\n\ncc @antoinedc`,
                labels: ['infra-alert', 'needs-human']
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/vnd.github.v3+json'
                }
            }
        );
        logger.info('Created escalation issue', { alertType });
    } catch (error) {
        logger.error('Failed to create escalation issue', { error: error.message });
    }
};

/**
 * Triggers the infra-auto-remediation GitHub Actions workflow.
 * @param {string} alertType - Type of infrastructure alert
 * @param {string} details - Alert details for the investigation
 */
const triggerRemediation = async (alertType, details) => {
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
        // Rate limit check uses Redis — if Redis is down (which may be the alert itself), skip rate limiting and proceed
        logger.warn('Rate limit check failed, proceeding with remediation', { alertType, error: error.message });
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

        // Set dedup key only after successful dispatch to avoid false escalations on transient failures
        const lastKey = `infra:remediation:last:${alertType}`;
        await redis.set(lastKey, Date.now().toString(), 'EX', REMEDIATION_REPEAT_WINDOW_SECONDS);

        logger.info('Triggered auto-remediation workflow', { alertType });
    } catch (error) {
        logger.error('Failed to trigger remediation workflow', { error: error.message, alertType });
    }
};

module.exports = async () => {
    let incidentCreated = false;

    // Run all checks in parallel — each is independent
    const [redisResult, postgresResult] = await Promise.all([
        checkRedis().catch(error => ({ service: 'redis', status: 'unhealthy', error: error.message })),
        checkPostgres().catch(error => ({ service: 'postgres', status: 'unhealthy', error: error.message }))
    ]);

    logger.info('Infrastructure health check', { redis: redisResult, postgres: postgresResult });

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
        const details = `Redis connectivity failed: ${redisResult.error}`;
        await createIncident('Redis connectivity failure', details, 'P1', { alias: 'infra-redis-connectivity' });
        await triggerRemediation('redis-connectivity', details);
        incidentCreated = true;
    }

    // PostgreSQL connectivity failure
    if (postgresResult.status === 'unhealthy') {
        const details = `PostgreSQL connectivity failed: ${postgresResult.error}`;
        await createIncident('PostgreSQL connectivity failure', details, 'P1', { alias: 'infra-postgres-connectivity' });
        await triggerRemediation('postgres-connectivity', details);
        incidentCreated = true;
    }

    return { incidentCreated, redis: redisResult, postgres: postgresResult };
};
