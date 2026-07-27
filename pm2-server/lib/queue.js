/**
 * @fileoverview BullMQ queue utilities for PM2 server.
 * Provides enqueue function to add jobs to the main Ethernal queue.
 * @module pm2-server/lib/queue
 */

const Redis = require('ioredis');
const { Queue } = require('bullmq');

const redisUrl = process.env.ETHERNAL_REDIS_URL

/**
 * IP family used to resolve the Redis host.
 *
 * ioredis defaults to IPv4. Set ETHERNAL_REDIS_FAMILY=6 when Redis is reached
 * over an IPv6-only network (e.g. Fly.io private networking, where *.internal
 * names publish AAAA records only), otherwise the connection never resolves.
 *
 * Parsed to a Number on purpose: net.connect() ignores a string `family`.
 *
 * @returns {number} 4 or 6
 */
const getRedisFamily = () => parseInt(process.env.ETHERNAL_REDIS_FAMILY, 10) || 4;

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

const connection = new Redis(redisUrl, { family: getRedisFamily() });

const enqueue = (queueName, jobName, data, priority = 1) => {
    const queue = new Queue(queueName, { connection, defaultJobOptions });
    return queue.add(jobName, data, { priority });
};

module.exports = {
    enqueue
}
