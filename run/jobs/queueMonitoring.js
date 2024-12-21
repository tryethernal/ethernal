const { Queue } = require('bullmq');
const connection = require('../lib/redis');
const logger = require('../lib/logger');
const { createIncident } = require('../lib/opsgenie');
const { maxTimeWithoutEnqueuedJob, queueMonitoringMaxProcessingTime, queueMonitoringHighProcessingTimeThreshold, queueMonitoringHighWaitingJobCountThreshold, queueMonitoringMaxWaitingJobCount } = require('../lib/env');

const monitoredPerformances = [
    'blockSync', 'receiptSync'
];

const monitoredActivity = ['blockSync'];

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

        if (latestJob.timestamp < Date.now() - maxTimeWithoutEnqueuedJob() * 1000) {
            await createIncident(`${queueName} queue issue (no jobs enqueued)`, `Latest job timestamp: ${new Date(latestJob.timestamp).toISOString()}`);
            incidentCreated = true;
        }
    }

    for (const queueName of monitoredPerformances) {
        const queue = new Queue(queueName, { connection });
        const completedJobs = await queue.getCompleted();

        const averageProcessingTime = completedJobs.reduce((a, b) => {
            return b && b.finishedOn ? a + (b.finishedOn - b.processedOn) / 1000 : a;
        }, 0) / completedJobs.length;

        const waitingJobCount = await queue.getWaitingCount();
        const delayedJobCount = await queue.getDelayedCount();

        logger.info('Queue monitoring', { queueName, averageProcessingTime, waitingJobCount, delayedJobCount });

        if (
            averageProcessingTime > queueMonitoringMaxProcessingTime() ||
            waitingJobCount >= queueMonitoringMaxWaitingJobCount() ||
            (averageProcessingTime >= queueMonitoringHighProcessingTimeThreshold() && waitingJobCount >= queueMonitoringHighWaitingJobCountThreshold())
        ) {
            await createIncident(`${queueName} queue issue (performance)`, `Waiting job count: ${waitingJobCount} - Delayed job count: ${delayedJobCount} - Average processing time: ${averageProcessingTime}s`);
            incidentCreated = true;
        }
    }

    return incidentCreated;
};
