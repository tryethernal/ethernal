require('../instrument');
const Sentry = require('@sentry/node');
const { initializeApp } = require('firebase-admin/app');
initializeApp();
const { Worker, MetricsTime } = require('bullmq');
const connection = require('../lib/redis');
const jobs = require('../jobs');
const logger = require('../lib/logger');
const priorities = require('./priorities.json');
const { managedWorkerError } = require('../lib/errors');

priorities['high'].forEach(jobName => {
    const worker = new Worker(
        jobName,
        job => {
            return Sentry.startSpan(
                { name: jobName }, () => {
                    return jobs[jobName](job)
                }
            )
        },
        {
            concurrency: 50,
            connection,
            metrics: {
                maxDataPoints: MetricsTime.ONE_WEEK * 2,
            }
        }
    );
    worker.on('failed', (job, error) => managedWorkerError(error, jobName, job.data, 'highPriority'));

    logger.info(`Started worker "${jobName}" - Priority: high`);
});
