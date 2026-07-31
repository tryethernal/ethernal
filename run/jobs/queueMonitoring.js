/**
 * @fileoverview Queue monitoring job.
 * Monitors BullMQ queue performance, liveness, and failure rates, and creates
 * OpsGenie alerts with dedup keys to prevent alert storms.
 * @module jobs/queueMonitoring
 */

const { Queue } = require('bullmq');
const redis = require('../lib/redis');
const logger = require('../lib/logger');
const { createIncident, closeIncident } = require('../lib/opsgenie');
const { maxTimeWithoutEnqueuedJob, queueMonitoringMaxProcessingTime, queueMonitoringHighProcessingTimeThreshold, queueMonitoringHighWaitingJobCountThreshold, queueMonitoringMaxWaitingJobCount, queueMonitoringBreachesBeforeAlert } = require('../lib/env');
const priorities = require('../workers/priorities');

const monitoredPerformances = ['blockSync', 'receiptSync'];

const monitoredActivity = ['blockSync'];

// Cache key and interval for legacy cleanup throttling
const LEGACY_CLEANUP_CACHE_KEY = 'queue:legacy_cleanup_last_run';
const LEGACY_CLEANUP_INTERVAL_MS = 15 * 60 * 1000; // Run cleanup every 15 minutes instead of every 2 minutes

// Consecutive-breach counters expire well after a few monitoring cycles so a
// queue that recovers and stays quiet starts from zero again.
const BREACH_COUNTER_TTL_S = 30 * 60;

/**
 * Records the outcome of one threshold evaluation and reports whether the
 * condition has now been breached on enough *consecutive* samples to page.
 *
 * A single bad sample is not actionable: bulk backfills burst the backlog into
 * the thousands and drain within minutes. Requiring N consecutive breaches
 * turns the check into "the queue is not draining" instead of
 * "the queue is momentarily deep".
 *
 * @param {string} alias - Incident dedup alias, used as the counter key
 * @param {boolean} breached - Whether this sample breached the threshold
 * @returns {Promise<{ shouldAlert: boolean, consecutiveBreaches: number }>}
 */
const trackBreach = async (alias, breached) => {
    const key = `queue:breach:${alias}`;

    if (!breached) {
        await redis.del(key);
        return { shouldAlert: false, consecutiveBreaches: 0 };
    }

    const consecutiveBreaches = await redis.incr(key);
    await redis.expire(key, BREACH_COUNTER_TTL_S);

    return {
        shouldAlert: consecutiveBreaches >= queueMonitoringBreachesBeforeAlert(),
        consecutiveBreaches
    };
};

/**
 * Computes the p95 processing time (in seconds) from an array of completed jobs.
 * Returns 0 if no valid jobs are provided.
 * @param {Array<Object>} jobs - BullMQ completed job objects
 * @returns {number} The 95th percentile processing time in seconds
 */
const computeP95ProcessingTime = (jobs) => {
    const times = jobs
        .filter(j => j && j.finishedOn && j.processedOn)
        .map(j => (j.finishedOn - j.processedOn) / 1000)
        .sort((a, b) => a - b);

    if (times.length === 0)
        return 0;

    const index = Math.ceil(times.length * 0.95) - 1;
    return times[index];
};

/**
 * Cleans up legacy BullMQ v4 'priority' sorted sets that leak memory.
 * BullMQ v5 uses 'prioritized' instead, but orphaned entries accumulate
 * in the old 'priority' key and can consume gigabytes of Redis memory.
 * This cleanup must run independently of monitoring configuration.
 *
 * Throttled to run every 15 minutes to reduce N+1 Redis queries on each monitoring cycle.
 */
const cleanupLegacyRedisKeys = async () => {
    // Check if we should skip cleanup based on throttling
    const lastRunTime = await redis.get(LEGACY_CLEANUP_CACHE_KEY);
    const now = Date.now();

    if (lastRunTime && (now - parseInt(lastRunTime)) < LEGACY_CLEANUP_INTERVAL_MS) {
        return; // Skip cleanup if run recently
    }

    const allQueues = [...priorities['high'], ...priorities['medium'], ...priorities['low'], 'processHistoricalBlocks'];
    if (allQueues.length === 0) return;

    const pipeline = redis.pipeline();

    // Build pipeline with all zcard commands
    allQueues.forEach(queueName => {
        const key = `bull:${queueName}:priority`;
        pipeline.zcard(key);
    });

    const zcardResults = await pipeline.exec();

    // Build second pipeline for unlinking keys with entries
    const unlinkPipeline = redis.pipeline();
    const keysToUnlink = [];

    zcardResults.forEach((result, index) => {
        if (!result[0]) { // No error
            const count = result[1];
            const queueName = allQueues[index];
            const key = `bull:${queueName}:priority`;

            if (count > 0) {
                unlinkPipeline.unlink(key);
                keysToUnlink.push({ queueName, entriesRemoved: count });
            }
        }
    });

    if (keysToUnlink.length > 0) {
        await unlinkPipeline.exec();
        keysToUnlink.forEach(({ queueName, entriesRemoved }) => {
            logger.info('Cleaned legacy priority key', { queueName, entriesRemoved });
        });
    }

    // Update cache to track when cleanup last ran
    await redis.set(LEGACY_CLEANUP_CACHE_KEY, now.toString(), 'EX', Math.ceil(LEGACY_CLEANUP_INTERVAL_MS / 1000));
};

module.exports = async () => {
    let incidentCreated = false;

    // Always run Redis cleanup first, regardless of monitoring configuration.
    // This prevents Redis OOM from legacy BullMQ v4 priority keys.
    await cleanupLegacyRedisKeys();

    // Cache queue instances to avoid repeated instantiation
    const queueCache = new Map();
    const getQueue = (queueName) => {
        if (!queueCache.has(queueName)) {
            queueCache.set(queueName, new Queue(queueName, { connection: redis }));
        }
        return queueCache.get(queueName);
    };

    // Monitor activity - check for recent job enqueue
    for (const queueName of monitoredActivity) {
        const queue = getQueue(queueName);
        const completedJobs = await queue.getCompleted(0, 0); // Only get the latest job
        const latestJob = completedJobs[0];

        if (latestJob && latestJob.timestamp < Date.now() - maxTimeWithoutEnqueuedJob() * 1000) {
            await createIncident(
                `${queueName} queue issue (no jobs enqueued)`,
                `Latest job timestamp: ${new Date(latestJob.timestamp).toISOString()}`,
                'P1',
                { alias: `queue-activity-${queueName}` }
            );
            incidentCreated = true;
        } else if (latestJob) {
            await closeIncident(`queue-activity-${queueName}`, { note: 'Activity recovered: a recent job was enqueued.' });
        }
    }

    // Monitor performance - batch queue stats collection with reduced call frequency
    if (monitoredPerformances.length > 0) {
        // Process queues sequentially to reduce parallel Redis load
        // This reduces peak concurrent Redis operations from 8+ to 4 per queue
        for (const queueName of monitoredPerformances) {
            const queue = getQueue(queueName);

            // Batch the basic stats calls together, but process queues sequentially.
            // Only the `wait` list gates paging. Jobs in the `prioritized` sorted
            // set are normal pending work that drains on its own and is not a
            // symptom of a stuck queue, so it is recorded for diagnostics only
            // and deliberately excluded from the alert condition.
            const [completedJobs, waitingJobCount, prioritizedJobCount, delayedJobCount, failedJobCount] = await Promise.all([
                queue.getCompleted(0, 19), // Limit to 20 jobs for P95 calculation (reduces Redis N+1 from ~200 to ~40 calls)
                queue.getWaitingCount(),
                queue.getPrioritizedCount(),
                queue.getDelayedCount(),
                queue.getFailedCount()
            ]);

            // Only fetch failed jobs if there are failures - eliminates N+1 pattern
            const failedJobs = failedJobCount > 0 ? await queue.getFailed(0, 19) : [];

            const p95ProcessingTime = computeP95ProcessingTime(completedJobs);

            const performanceAlias = `queue-performance-${queueName}`;
            const breached =
                p95ProcessingTime > queueMonitoringMaxProcessingTime() ||
                waitingJobCount >= queueMonitoringMaxWaitingJobCount() ||
                (p95ProcessingTime >= queueMonitoringHighProcessingTimeThreshold() && waitingJobCount >= queueMonitoringHighWaitingJobCountThreshold());

            const { shouldAlert, consecutiveBreaches } = await trackBreach(performanceAlias, breached);

            logger.info('Queue monitoring', { queueName, p95ProcessingTime, waitingJobCount, prioritizedJobCount, delayedJobCount, failedJobCount, consecutiveBreaches });

            if (shouldAlert) {
                await createIncident(
                    `${queueName} queue issue (performance)`,
                    `Waiting: ${waitingJobCount} - Delayed: ${delayedJobCount} - Failed: ${failedJobCount} - P95 processing time: ${p95ProcessingTime.toFixed(2)}s - Sustained for ${consecutiveBreaches} consecutive checks`,
                    'P1',
                    { alias: performanceAlias }
                );
                incidentCreated = true;
            } else if (!breached) {
                await closeIncident(performanceAlias, {
                    note: `Performance recovered. Waiting: ${waitingJobCount} - P95: ${p95ProcessingTime.toFixed(2)}s`
                });
            }

            const recentFailures = failedJobs.filter(j => j && j.finishedOn && j.finishedOn > Date.now() - 5 * 60 * 1000);

            if (recentFailures.length >= 10) {
                await createIncident(
                    `${queueName} queue issue (failures)`,
                    `${recentFailures.length} failed jobs in the last 5 minutes`,
                    'P2',
                    { alias: `queue-failures-${queueName}` }
                );
                incidentCreated = true;
            } else {
                await closeIncident(`queue-failures-${queueName}`, {
                    note: `Failures recovered. ${recentFailures.length} failed jobs in the last 5 minutes`
                });
            }
        }
    }


    // Cap-sweep moved to dedicated queueCapSweep job (runs every 10s; see scheduler.js).

    return incidentCreated;
};
