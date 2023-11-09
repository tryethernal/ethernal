jest.mock('../../../lib/analytics', () => {
    return jest.fn().mockImplementation(() => ({
        track: jest.fn(),
        shutdown: jest.fn()
    }));
});
