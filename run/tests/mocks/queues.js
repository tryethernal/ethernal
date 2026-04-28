jest.mock('../../queues', () => ({
    test: { addBulk: jest.fn() },
    blockSync: { add: jest.fn(), addBulk: jest.fn() },
    receiptSync: { add: jest.fn(), addBulk: jest.fn() },
}));
