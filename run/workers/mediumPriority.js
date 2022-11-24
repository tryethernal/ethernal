const { Worker } = require('bullmq');
const connection = require('../config/redis')[process.env.NODE_ENV || 'production'];
const jobs = require('../jobs');
const writeLog = require('../lib/writeLog');
const priorities = require('./priorities.json');

priorities['medium'].forEach(jobName => {
    const worker = new Worker(
        jobName,
        async job => await jobs[jobName](job),
        { concurrency: 50 , connection },
    );
    worker.on('failed', (job, err) => {
        writeLog({ functionName: `workers.${jobName}`, error: err, extra: {
            jobName: job.name,
            data: job.data 
        }});
    });
    console.log(`Started worker "${jobName}" - Priority: medium`);
});
