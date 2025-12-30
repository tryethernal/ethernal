/**
 * @fileoverview Redis-based rate limiting using rolling window.
 * Prevents abuse by limiting request frequency per identifier.
 * @module lib/rateLimiter
 */

const { RedisRateLimiter } = require('rolling-rate-limiter');
const redis = require('../lib/redis');

/**
 * Rate limiter using Redis for distributed rate limiting.
 * Implements a rolling window algorithm.
 * @class RateLimiter
 */
class RateLimiter {

    /**
     * Creates a new RateLimiter instance.
     * @param {string} id - Unique identifier for rate limiting (e.g., user ID, IP)
     * @param {number} interval - Time window in milliseconds
     * @param {number} maxInInterval - Maximum requests allowed in the interval
     */
    constructor(id, interval, maxInInterval) {
        this.id = id;
        this.limiter = new RedisRateLimiter({
            client: redis,
            namespace: 'rate-limiter',
            interval, maxInInterval
        });
    }

    /**
     * Checks and enforces the rate limit, consuming one request.
     * @returns {Promise<boolean>} True if request should be blocked
     */
    limit() {
        return this.limiter.limit(this.id);
    }

    /**
     * Checks if a request would be limited without consuming the request.
     * @returns {Promise<Object>} Info about current limit status
     */
    wouldLimit() {
        return this.limiter.wouldLimitWithInfo(this.id);
    }
}

module.exports = RateLimiter;
