const { Worker } = require('bullmq');
const connection = require('../config/redis')[process.env.NODE_ENV || 'production'];
const jobs = require('../jobs');
const logger = require('../lib/logger');
const priorities = require('./priorities.json');

priorities['high'].forEach(jobName => {
    const worker = new Worker(
        jobName,
        async job => await jobs[jobName](job),
        { concurrency: 50 , connection },
    );
    worker.on('failed', (job, error) => {
        logger.error(error.message, {
            location: `workers.highPriority.${jobName}`,
            error: error,
            data: job.data 
        });
    });
    console.log(`Started worker "${jobName}" - Priority: high`);
});
