require('../lib/instrument');
const { getNodeEnv } = require('../lib/env');
const { Worker } = require('bullmq');
const connection = require('../config/redis')[getNodeEnv()];
const jobs = require('../jobs');
const logger = require('../lib/logger');
const priorities = require('./priorities.json');
const { managedWorkerError } = require('../lib/errors');

priorities['medium'].forEach(jobName => {
    const worker = new Worker(
        jobName,
        async job => await jobs[jobName](job),
        { maxStalledCount: 5, lockDuration: 300000, concurrency: 50, connection },
    );
    worker.on('failed', (job, error) => managedWorkerError(error, jobName, job.data, 'mediumPriority'));

    if (getNodeEnv() == 'production')
        logger.info(`Started worker "${jobName}" - Priority: medium`);
    else
        console.log(`Started worker "${jobName}" - Priority: medium`);
});
