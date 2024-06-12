const Mutex = require('redis-semaphore').Mutex
const { getNodeEnv } = require('./env');
const Redis = require('ioredis');
const config = require('../config/redis')[getNodeEnv()];

const redis = new Redis(config);

class Lock {

    constructor(id, lockTimeout) {
        this.mutex = new Mutex(redis, id, {
            acquireAttemptsLimit: 1,
            lockTimeout
        });
    }

    acquire() {
        return this.mutex.tryAcquire();
    }

    release() {
        return this.mutex.release();
    }
}

module.exports = Lock;
