jest.mock('../../../lib/env', () => ({
    getAppDomain: jest.fn(() => 'ethernal.com')
}));
