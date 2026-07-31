jest.mock('bullmq');
jest.mock('../../../lib/queue', () => ({
    enqueue: jest.fn().mockResolvedValue(true),
    bulkEnqueue: jest.fn().mockResolvedValue({ attempted: 0, accepted: 0, dropped: 0 })
}));
