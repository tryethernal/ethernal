jest.mock('bullmq');
jest.mock('../../../lib/queue', () => ({
    enqueue: jest.fn().mockResolvedValue(true),
    bulkEnqueue: jest.fn().mockResolvedValue(true)
}));
