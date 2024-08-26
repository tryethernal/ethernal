require('../instrument');
const { initializeApp } = require('firebase-admin/app');
const { getNodeEnv } = require('../lib/env');
initializeApp();
const { Worker } = require('bullmq');
const connection = require('../config/redis')[getNodeEnv()];
const jobs = require('../jobs');
const logger = require('../lib/logger');
const priorities = require('./priorities.json');
const { managedWorkerError } = require('../lib/errors');

priorities['high'].forEach(jobName => {
    const worker = new Worker(
        jobName,
        async job => await jobs[jobName](job),
        { concurrency: 200, maxStalledCount: 5, connection },
    );
    worker.on('failed', (job, error) => managedWorkerError(error, jobName, job.data, 'highPriority'));

    logger.info(`Started worker "${jobName}" - Priority: high`);
});
