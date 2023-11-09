jest.mock('../../../lib/env', () => ({
    getAppDomain: jest.fn(() => 'ethernal.com'),
    getDefaultPlanSlug: jest.fn(() => 'selfhosted'),
    getScannerKey: jest.fn(() => 'key'),
    getGhostApiKey: jest.fn(),
    getGhostEndpoint: jest.fn(),
    getMixpanelApiToken: jest.fn(),
    getDemoUserId: jest.fn(() => 1),
    getStripeSecretKey: jest.fn(() => 'x'),
    getDemoTrialSlug: jest.fn(() => 'slug'),
    getDefaultExplorerTrialDays: jest.fn(() => 7),
    getPostHogApiKey: jest.fn(() => 'x')
}));
