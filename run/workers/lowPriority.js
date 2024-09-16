require('../instrument');
const Sentry = require('@sentry/node');
const { getNodeEnv } = require('../lib/env');
const { Worker } = require('bullmq');
const connection = require('../config/redis')[getNodeEnv()];
const jobs = require('../jobs');
const logger = require('../lib/logger');
const priorities = require('./priorities.json');
const { managedWorkerError } = require('../lib/errors');

priorities['low'].forEach(jobName => {
    const worker = new Worker(
        jobName,
        job => {
            return Sentry.startSpan(
                { name: jobName }, () => {
                    return jobs[jobName](job)
                }
            )
        },
        { concurrency: 10, maxStalledCount: 5, connection },
    );
    worker.on('failed', (job, error) => managedWorkerError(error, jobName, job.data, 'lowPriority'));

    logger.info(`Started worker "${jobName}" - Priority: low`);
});
