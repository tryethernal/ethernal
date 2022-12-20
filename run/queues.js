const { Queue } = require('bullmq');
const connection = require('./config/redis')[process.env.NODE_ENV || 'production'];
const priorities = require('./workers/priorities.json');

const queues = {};
priorities['high'].forEach(jobName => {
    queues[jobName] = new Queue(jobName, {
        defaultJobOptions: {
            attempts: 50,
            removeOnComplete: 100,
            timeout: 30000,
            backoff: {
                type: 'exponential',
                delay: 1000
            }
        },
        connection
    });
});

priorities['medium'].forEach(jobName => {
    queues[jobName] = new Queue(jobName, {
        defaultJobOptions: {
            attempts: 20,
            removeOnComplete: 20,
            timeout: 30000,
            backoff: {
                type: 'exponential',
                delay: 1000
            }
        },
        connection
    });
});

priorities['low'].forEach(jobName => {
    queues[jobName] = new Queue(jobName, {
        defaultJobOptions: {
            attempts: 10,
            removeOnComplete: 10,
            timeout: 30000,
            backoff: {
                type: 'exponential',
                delay: 1000
            }
        },
        connection
    });
});

module.exports = queues;
