jest.mock('../../queues', () => ({
    test: {
        addBulk: jest.fn()
    }
}));
