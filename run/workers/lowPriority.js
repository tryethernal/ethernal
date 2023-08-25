const { Worker } = require('bullmq');
const connection = require('../config/redis')[process.env.NODE_ENV || 'production'];
const jobs = require('../jobs');
const logger = require('../lib/logger');
const priorities = require('./priorities.json');

priorities['low'].forEach(jobName => {
    const worker = new Worker(
        jobName,
        async job => await jobs[jobName](job),
        { concurrency: 10 , connection },
    );
    worker.on('failed', (job, error) => {
        logger.error(error.message, {
            location: `workers.lowPriority.${jobName}`,
            error: error,
            data: job.data
        });
    });
    if (process.env.NODE_ENV == 'production')
        logger.info(`Started worker "${jobName}" - Priority: low`);
    else
        console.log(`Started worker "${jobName}" - Priority: low`);
});
