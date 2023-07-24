require('../mocks/lib/stripe');
require('../mocks/lib/firebase');
const db = require('../../lib/firebase');
const { handleStripePaymentSucceeded } = require('../../lib/stripe');
const StripePaymentSucceededWebhookBody = require('../fixtures/StripePaymentSucceededWebhookBody');

describe('handleStripePaymentSucceeded', () => {
    it('Should return true when event has payment intent', async () => {
        jest.spyOn(db, 'getUserbyStripeCustomerId').mockResolvedValueOnce({
            id: 1,
            firebaseUserId: 'abcd'
        });
        const data = StripePaymentSucceededWebhookBody.data.object;

        const result = await handleStripePaymentSucceeded(data);

        expect(result).toBe(true);
    });

    it('Should return true when event has no payment intent', async () => {
        jest.spyOn(db, 'getUserbyStripeCustomerId').mockResolvedValueOnce({
            id: 1,
            firebaseUserId: 'abcd'
        });
        const data = {
            ...StripePaymentSucceededWebhookBody.data.object,
            payment_intent: null
        };

        const result = await handleStripePaymentSucceeded(data);

        expect(result).toBe(true);
    })
});