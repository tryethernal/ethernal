const { Queue } = require('bullmq');
const connection = require('./lib/redis');
const priorities = require('./workers/priorities.json');

const queues = {};
priorities['high'].forEach(jobName => {
    queues[jobName] = new Queue(jobName, {
        defaultJobOptions: {
            attempts: 5,
            removeOnComplete: {
                count: 100,
                age: 4 * 60
            },
            timeout: 30000,
            backoff: {
                type: 'fixed',
                delay: 30000
            },
        },
        stalledInterval: 29000,
        maxStalledCount: 5,
        connection,
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
