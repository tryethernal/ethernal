const Helper = require('../helper');

jest.mock('stripe', () => {
    const StripeSubscription = require('../fixtures/StripeSubscription');
    return () => {
        return {
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
const stripe = require('stripe');
const { handleStripePaymentSucceeded } = require('../../lib/stripe');
const StripePaymentSucceededWebhookBody = require('../fixtures/StripePaymentSucceededWebhookBody');

describe('handleStripePaymentSucceeded', () => {
    beforeEach(async () => {
        const helper = new Helper(process.env.GCLOUD_PROJECT);
        await helper.setUser({ stripeCustomerId: 'cus_KN6AD8pwBHd2sF' });
    });

    it('Should return true when event has payment intent', async () => {
        const data = StripePaymentSucceededWebhookBody.data.object;

        const result = await handleStripePaymentSucceeded(data);

        expect(result).toBe(true);
    });

    it('Should return true when event has no payment intent', async () => {
        const data = {
            ...StripePaymentSucceededWebhookBody.data.object,
            payment_intent: null
        };

        const result = await handleStripePaymentSucceeded(data);

        expect(result).toBe(true);
    })
});