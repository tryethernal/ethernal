jest.mock('../../../lib/env', () => ({
    getAppDomain: jest.fn(() => 'ethernal.com'),
    getDefaultPlanSlug: jest.fn(() => 'selfhosted'),
    getScannerKey: jest.fn(() => 'key'),
    getGhostApiKey: jest.fn(),
    getGhostEndpoint: jest.fn(),
    getMixpanelApiToken: jest.fn(),
    getDemoUserId: jest.fn(() => 1),
    getStripeSecretKey: jest.fn(() => 'x'),
    getStripeWebhookSecret: jest.fn(() => '123'),
    getDemoTrialSlug: jest.fn(() => 'slug'),
    getDefaultExplorerTrialDays: jest.fn(() => 7),
    getPostHogApiKey: jest.fn(() => 'x'),
    getPostHogApiHost: jest.fn(() => 'x'),
    getMaxBlockForSyncReset: jest.fn(() => 1),
    getMaxContractForReset: jest.fn(() => 1),
    getEncryptionKey: jest.fn(() => '382A5C31A96D38E3DF430E5101E8D07D'),
    getEncryptionJwtSecret: jest.fn(() => '26F95488BA7D7E545B1B8669990739BB21A0A6D3EFB4910C0460B068BDDD3E1C')
}));
