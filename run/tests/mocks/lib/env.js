jest.mock('../../../lib/env', () => ({
    getAppDomain: jest.fn(() => 'ethernal.com'),
    getDefaultPlanSlug: jest.fn(() => 'selfhosted'),
    getScannerKey: jest.fn(() => 'key'),
    getGhostApiKey: jest.fn(),
    getGhostEndpoint: jest.fn(),
    getMixpanelApiToken: jest.fn()
}));
