require('../lib/instrument');
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
        async job => await jobs[jobName](job),
        { concurrency: 10, maxStalledCount: 5, connection },
    );
    worker.on('failed', (job, error) => managedWorkerError(error, jobName, job.data, 'lowPriority'));

    if (getNodeEnv())
        logger.info(`Started worker "${jobName}" - Priority: low`);
    else
        console.log(`Started worker "${jobName}" - Priority: low`);
});
