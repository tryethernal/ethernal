const { Queue } = require('bullmq');
const connection = require('../lib/redis');
const logger = require('../lib/logger');
const { createIncident } = require('../lib/opsgenie');
const { queueMonitoringMaxProcessingTime, queueMonitoringHighProcessingTimeThreshold, queueMonitoringHighWaitingJobCountThreshold, queueMonitoringMaxWaitingJobCount } = require('../lib/env');

const monitoredQueues = [
    'blockSync', 'receiptSync'
];

module.exports = async () => {
    if (!queueMonitoringMaxProcessingTime() || !queueMonitoringHighProcessingTimeThreshold() || !queueMonitoringHighWaitingJobCountThreshold() || !queueMonitoringMaxWaitingJobCount()) {
        return logger.info('Queue monitoring is not enabled');
    }

    for (const queueName of monitoredQueues) {
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
            (averageProcessingTime > queueMonitoringHighProcessingTimeThreshold() && waitingJobCount >= queueMonitoringHighWaitingJobCountThreshold()) ||
            waitingJobCount >= queueMonitoringMaxWaitingJobCount()
        ) {
            await createIncident(`${queueName} Queue monitoring`,
                `Waiting job count: ${waitingJobCount} - Delayed job count: ${delayedJobCount} - Average processing time: ${averageProcessingTime}s`
            );
        }
    }
};
