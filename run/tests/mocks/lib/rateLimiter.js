jest.mock('rolling-rate-limiter', () => {
    return {
        RedisRateLimiter: jest.fn().mockImplementation(() => ({
            limit: jest.fn(),
            wouldLimitWithInfo: jest.fn()
        }))
    }
});
jest.mock('ioredis');
jest.mock('../../../lib/rpc', () => {
    return {
        RateLimiter: jest.fn().mockImplementation(() => ({
            limit: jest.fn(),
            wouldLimit: jest.fn()
        }))
    }
});
