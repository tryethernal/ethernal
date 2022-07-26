jest.mock('../../../lib/tasks', () => ({
    enqueueTask: jest.fn()
}));
