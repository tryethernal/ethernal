jest.mock('../../../lib/env', () => ({
    getSecret: jest.fn(() => 'test-secret-123')
}));
