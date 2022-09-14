jest.mock('../../../lib/tasks', () => ({
    enqueueTask: jest.fn().mockResolvedValue(true)
}));
