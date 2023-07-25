jest.mock('../../../lib/flags', () => ({
    isStripeEnabled: jest.fn(() => true),
    isMarketingEnabled: jest.fn(() => true),
    isPusherEnabled: jest.fn(() => true),
    isSendgridEnabled: jest.fn(() => true),
    isFirebaseAuthEnabled: jest.fn(() => true),
    isGoogleApiEnabled: jest.fn(() => true),
    isApproximatedEnabled: jest.fn(() => true)
}));
