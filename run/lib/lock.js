const Mutex = require('redis-semaphore').Mutex
const redis = require('../lib/redis');

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
