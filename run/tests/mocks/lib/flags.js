jest.mock('../../../lib/flags', () => ({
    isSelfHosted: jest.fn(() => true),
    isStripeEnabled: jest.fn(() => true),
    isPusherEnabled: jest.fn(() => true),
    isFirebaseAuthEnabled: jest.fn(() => true),
    isGoogleApiEnabled: jest.fn(() => true),
    isApproximatedEnabled: jest.fn(() => true),
    isDemoEnabled: jest.fn(() => true),
    isQuicknodeEnabled: jest.fn(() => true),
    isMailjetEnabled: jest.fn(() => true),
    isSentryPipelineEnabled: jest.fn(() => false)
}));
