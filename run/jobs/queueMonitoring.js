/**
 * @fileoverview Queue monitoring job.
 * Monitors BullMQ queue performance, liveness, and failure rates, and creates
 * OpsGenie alerts with dedup keys to prevent alert storms.
 * @module jobs/queueMonitoring
 */

const { Queue } = require('bullmq');
const redis = require('../lib/redis');
const logger = require('../lib/logger');
const { createIncident } = require('../lib/opsgenie');
const { maxTimeWithoutEnqueuedJob, queueMonitoringMaxProcessingTime, queueMonitoringHighProcessingTimeThreshold, queueMonitoringHighWaitingJobCountThreshold, queueMonitoringMaxWaitingJobCount } = require('../lib/env');
const priorities = require('../workers/priorities');

const monitoredPerformances = ['blockSync', 'receiptSync'];

const monitoredActivity = ['blockSync'];

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

module.exports = async () => {
    if (!maxTimeWithoutEnqueuedJob() || !queueMonitoringMaxProcessingTime() || !queueMonitoringHighProcessingTimeThreshold() || !queueMonitoringHighWaitingJobCountThreshold() || !queueMonitoringMaxWaitingJobCount()) {
        logger.info('Queue monitoring is not enabled');
        return;
    }

    let incidentCreated = false;

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
        const completedJobs = await queue.getCompleted();
        const latestJob = completedJobs[0];

        if (latestJob && latestJob.timestamp < Date.now() - maxTimeWithoutEnqueuedJob() * 1000) {
            await createIncident(
                `${queueName} queue issue (no jobs enqueued)`,
                `Latest job timestamp: ${new Date(latestJob.timestamp).toISOString()}`,
                'P1',
                { alias: `queue-activity-${queueName}` }
            );
            incidentCreated = true;
        }
    }

    // Monitor performance - batch queue stats collection for all monitored queues
    if (monitoredPerformances.length > 0) {
        // Collect queue stats in parallel to reduce sequential Redis calls
        const queueStatsPromises = monitoredPerformances.map(async (queueName) => {
            const queue = getQueue(queueName);

            // Fetch all queue stats in parallel for this queue
            const [completedJobs, waitingJobCount, delayedJobCount, failedJobCount] = await Promise.all([
                queue.getCompleted(),
                queue.getWaitingCount(),
                queue.getDelayedCount(),
                queue.getFailedCount()
            ]);

            const p95ProcessingTime = computeP95ProcessingTime(completedJobs);

            // Fetch failed jobs in parallel if there are any failures
            let failedJobs = [];
            if (failedJobCount > 0) {
                failedJobs = await queue.getFailed(0, 99);
            }

            return {
                queueName,
                completedJobs,
                waitingJobCount,
                delayedJobCount,
                failedJobCount,
                failedJobs,
                p95ProcessingTime
            };
        });

        const allQueueStats = await Promise.all(queueStatsPromises);

        // Process results and create incidents
        for (const stats of allQueueStats) {
            const { queueName, completedJobs, waitingJobCount, delayedJobCount, failedJobCount, failedJobs, p95ProcessingTime } = stats;

            logger.info('Queue monitoring', { queueName, p95ProcessingTime, waitingJobCount, delayedJobCount, failedJobCount });

            if (
                p95ProcessingTime > queueMonitoringMaxProcessingTime() ||
                waitingJobCount >= queueMonitoringMaxWaitingJobCount() ||
                (p95ProcessingTime >= queueMonitoringHighProcessingTimeThreshold() && waitingJobCount >= queueMonitoringHighWaitingJobCountThreshold())
            ) {
                await createIncident(
                    `${queueName} queue issue (performance)`,
                    `Waiting: ${waitingJobCount} - Delayed: ${delayedJobCount} - Failed: ${failedJobCount} - P95 processing time: ${p95ProcessingTime.toFixed(2)}s`,
                    'P1',
                    { alias: `queue-performance-${queueName}` }
                );
                incidentCreated = true;
            }

            if (failedJobCount > 0) {
                const recentFailures = failedJobs.filter(j => j && j.finishedOn && j.finishedOn > Date.now() - 5 * 60 * 1000);

                if (recentFailures.length >= 10) {
                    await createIncident(
                        `${queueName} queue issue (failures)`,
                        `${recentFailures.length} failed jobs in the last 5 minutes`,
                        'P2',
                        { alias: `queue-failures-${queueName}` }
                    );
                    incidentCreated = true;
                }
            }
        }
    }

    // Clean up legacy BullMQ v4 'priority' sorted sets that leak memory.
    // BullMQ v5 uses 'prioritized' instead, but orphaned entries accumulate
    // in the old 'priority' key and can consume gigabytes of Redis memory.
    // Use Redis pipeline to batch all cleanup operations.
    const allQueues = [...priorities['high'], ...priorities['medium'], ...priorities['low'], 'processHistoricalBlocks'];
    if (allQueues.length > 0) {
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
    }

    return incidentCreated;
};
