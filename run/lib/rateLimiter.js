const { RedisRateLimiter } = require('rolling-rate-limiter');
const Redis = require('ioredis');

const redis = new Redis({
    port: process.env.REDIS_PORT,
    host: process.env.REDIS_HOST
});

class RateLimiter {

    constructor(id, interval) {
        this.id = id;
        this.limiter = new RedisRateLimiter({
            client: redis,
            namespace: 'rate-limiter',
            interval: interval,
            maxInInterval: 5
        });
    }

    limit() {
        return this.limiter.limit(this.id);
    }

    wouldLimit() {
        return this.limiter.wouldLimitWithInfo(this.id);
    }
}

module.exports = RateLimiter;
