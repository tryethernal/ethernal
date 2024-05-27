const { RedisRateLimiter } = require('rolling-rate-limiter');
const { getNodeEnv } = require('../lib/env');
const Redis = require('ioredis');
const config = require('../config/redis')[getNodeEnv()];

const redis = new Redis(config);

class RateLimiter {

    constructor(id, interval, maxInInterval) {
        this.id = id;
        this.limiter = new RedisRateLimiter({
            client: redis,
            namespace: 'rate-limiter',
            interval, maxInInterval
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
