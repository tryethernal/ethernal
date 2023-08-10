jest.mock('stripe', () => {
    const StripeSubscription = require('../../fixtures/StripeSubscription');

    return jest.fn(() => {
        return {
            customers: {
                create: jest.fn().mockResolvedValue({ id: '1234' }),
                retrieve: jest.fn()
            },
            webhooks: {
                constructEvent: jest.fn().mockReturnValue({ type: 'invoice.payment_succeeded', data: { object: {}}})
            },
            paymentIntents: {
                retrieve: () => {
                    return new Promise((resolve) => resolve({ payment_method: 'car_123' }));
                }
            },
            subscriptions: {
                retrieve: () => {
                    return new Promise((resolve) => resolve(StripeSubscription))
                }
            }
        }
    });
});
