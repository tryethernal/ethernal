/**
 * @fileoverview Queue monitoring job.
 * Monitors BullMQ queue performance, liveness, and failure rates, and creates
 * OpsGenie alerts with dedup keys to prevent alert storms.
 * @module jobs/queueMonitoring
 */

const { Queue } = require('bullmq');
const connection = require('../lib/redis');
const logger = require('../lib/logger');
const { createIncident } = require('../lib/opsgenie');
const { maxTimeWithoutEnqueuedJob, queueMonitoringMaxProcessingTime, queueMonitoringHighProcessingTimeThreshold, queueMonitoringHighWaitingJobCountThreshold, queueMonitoringMaxWaitingJobCount } = require('../lib/env');

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

    for (const queueName of monitoredActivity) {
        const queue = new Queue(queueName, { connection });
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

    for (const queueName of monitoredPerformances) {
        const queue = new Queue(queueName, { connection });
        const completedJobs = await queue.getCompleted();

        const p95ProcessingTime = computeP95ProcessingTime(completedJobs);

        const waitingJobCount = await queue.getWaitingCount();
        const delayedJobCount = await queue.getDelayedCount();
        const failedJobCount = await queue.getFailedCount();

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
            const failedJobs = await queue.getFailed(0, 99);
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

    return incidentCreated;
};
