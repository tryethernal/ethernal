const { RedisRateLimiter } = require('rolling-rate-limiter');
const redis = require('../lib/redis');

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
