require('../instrument');
const Sentry = require('@sentry/node');
const { Worker } = require('bullmq');
const connection = require('../lib/redis');
const jobs = require('../jobs');
const logger = require('../lib/logger');
const priorities = require('./priorities.json');
const { managedWorkerError } = require('../lib/errors');

priorities['medium'].forEach(jobName => {
    const worker = new Worker(
        jobName,
        job => {
            return Sentry.startSpan(
                { name: jobName }, () => {
                    return jobs[jobName](job)
                }
            )
        },
        { maxStalledCount: 5, lockDuration: 300000, concurrency: 50, connection },
    );
    worker.on('failed', (job, error) => managedWorkerError(error, jobName, job.data, 'mediumPriority'));

    logger.info(`Started worker "${jobName}" - Priority: medium`);
});
