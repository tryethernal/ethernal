require('./env');
jest.mock('ioredis');
jest.mock('redis-semaphore', () => {
    return {
        Mutex: jest.fn()
    }
});
jest.mock('../../../lib/lock', () => {
    return jest.fn().mockImplementation(() => ({
        acquire: jest.fn().mockResolvedValue(true),
        release: jest.fn().mockResolvedValue(true)
    }))
});
