/**
 * @fileoverview Redis-based distributed mutex lock.
 * Prevents concurrent execution of critical sections across processes.
 * @module lib/lock
 */

const Mutex = require('redis-semaphore').Mutex
const redis = require('../lib/redis');

/**
 * Distributed mutex lock using Redis.
 * Used to prevent race conditions in concurrent job processing.
 * @class Lock
 */
class Lock {

    /**
     * Creates a new Lock instance.
     * @param {string} id - Unique identifier for this lock
     * @param {number} lockTimeout - Maximum time to hold the lock in milliseconds
     */
    constructor(id, lockTimeout) {
        this.mutex = new Mutex(redis, id, {
            acquireAttemptsLimit: 1,
            lockTimeout
        });
    }

    /**
     * Attempts to acquire the lock without blocking.
     * @returns {Promise<boolean>} True if lock acquired, false otherwise
     */
    acquire() {
        return this.mutex.tryAcquire();
    }

    /**
     * Releases the lock.
     * @returns {Promise<void>}
     */
    release() {
        return this.mutex.release();
    }
}

module.exports = Lock;
