/**
 * @fileoverview BullMQ queue utilities for PM2 server.
 * Provides enqueue function to add jobs to the main Ethernal queue.
 * @module pm2-server/lib/queue
 */

const Redis = require('ioredis');
const { Queue } = require('bullmq');

const redisUrl = process.env.ETHERNAL_REDIS_URL

const defaultJobOptions = {
    attempts: 50,
    removeOnComplete: {
        count: 100,
        age: 4 * 60
    },
    timeout: 30000,
    backoff: {
        type: 'exponential',
        delay: 1000
    }
};

const connection = new Redis(redisUrl);

const enqueue = (queueName, jobName, data, priority = 1) => {
    const queue = new Queue(queueName, { connection, defaultJobOptions });
    return queue.add(jobName, data, { priority });
};

module.exports = {
    enqueue
}
