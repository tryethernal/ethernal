require('./rpc');
jest.mock('ioredis');
jest.mock('rolling-rate-limiter', () => {
    return {
        RedisRateLimiter: jest.fn().mockImplementation(() => ({
            limit: jest.fn(),
            wouldLimitWithInfo: jest.fn()
        }))
    }
});

