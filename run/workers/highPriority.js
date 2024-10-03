require('../instrument');
const Sentry = require('@sentry/node');
const { initializeApp } = require('firebase-admin/app');
initializeApp();
const { Worker } = require('bullmq');
const connection = require('../lib/redis');
const jobs = require('../jobs');
const logger = require('../lib/logger');
const priorities = require('./priorities.json');
const { managedWorkerError } = require('../lib/errors');

console.log(connection)

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
        { concurrency: 200, maxStalledCount: 5, connection },
    );
    worker.on('failed', (job, error) => managedWorkerError(error, jobName, job.data, 'highPriority'));

    logger.info(`Started worker "${jobName}" - Priority: high`);
});
