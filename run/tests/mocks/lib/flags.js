jest.mock('../../../lib/flags', () => ({
    isStripeEnabled: true,
    isMarketingEnabled: true,
    isPusherEnabled: true
}));
