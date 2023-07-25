jest.mock('axios', () => ({
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn()
}));
