/**
 * @fileoverview Shared Redis client instance.
 * Provides a singleton ioredis connection used by locks, caching, and BullMQ.
 * @module lib/redis
 */

const { getRedisUrl, getRedisFamily } = require('./env');
const Redis = require('ioredis');

/**
 * Singleton Redis client instance.
 * Configured with unlimited retries per request for BullMQ compatibility.
 * @type {Redis}
 */
module.exports = new Redis(getRedisUrl(), {
    maxRetriesPerRequest: null,
    family: getRedisFamily() || 4,
});
