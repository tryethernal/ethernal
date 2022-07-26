jest.mock('stripe', () => {
    const StripeSubscription = require('../../fixtures/StripeSubscription');
    return () => {
        return {
            webhooks: {
                constructEvent: jest.fn().mockReturnValue({ type: 'invoice.payment_succeeded', data: { object: {}}})
            },
            checkout: {
                sessions: {
                    create: jest.fn().mockResolvedValue({ url: 'https://stripe.com' })
                }
            },
            billingPortal: {
                sessions: {
                    create: jest.fn().mockResolvedValue({ url: 'https://stripe.com' })
                }
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
    }
});
