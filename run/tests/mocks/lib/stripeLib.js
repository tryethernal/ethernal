jest.mock('../../../lib/stripe', () => ({
    handleStripeSubscriptionUpdate: jest.fn(),
    handleStripeSubscriptionDeletion: jest.fn(),
    handleStripePaymentSucceeded: jest.fn()
}));
