jest.mock('../../../lib/flags', () => ({
    isStripeEnabled: true,
    isMarketingEnabled: true,
    isPusherEnabled: true,
    isSendgridEnabled: jest.fn(() => true),
    isFirebaseAuthEnabled: jest.fn(() => true)
}));
