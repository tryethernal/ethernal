const Helper = require('../helper');
const { updatePlan } = require('../../lib/billing');

const StripeSubscription = require('../fixtures/StripeSubscription');
const StripeCanceledSubscription = require('../fixtures/StripeCanceledSubscription');

describe('updatePlan', () => {
    let helper;

    beforeEach(() => {
        helper = new Helper(process.env.GCLOUD_PROJECT);
    });

    it('Should return true when passing an active subscription & set the plan to premium', async () => {
        await helper.setUser({ plan: 'premium', stripeCustomerId: StripeSubscription.customer });
        const result = await updatePlan(StripeSubscription);
        expect(result).toBe(true);

        const userRef = await helper.firestore.collection('users').doc('123').get();

        expect(userRef.data()).toEqual({
            plan: 'premium',
            stripeCustomerId: StripeSubscription.customer
        });
    });

    it('Should return true when passing a trial subscription & set the plan to premium with a trial end', async () => {
        const subscription = {
            ...StripeSubscription,
            trial_end: 1633778007
        };

        await helper.setUser({ plan: 'premium', stripeCustomerId: subscription.customer });
        const result = await updatePlan(subscription);
        expect(result).toBe(true);

        const userRef = await helper.firestore.collection('users').doc('123').get();

        expect(userRef.data()).toEqual({
            plan: 'premium',
            stripeCustomerId: subscription.customer,
            trialEndsAt: '2021-10-09T13:13:27+02:00'
        });
    });

    it('Should return true when passing an inactive subscription & set the plan to free', async () => {
        await helper.setUser({ plan: 'premium', stripeCustomerId: StripeCanceledSubscription.customer });
        const result = await updatePlan(StripeCanceledSubscription);
        expect(result).toBe(true);

        const userRef = await helper.firestore.collection('users').doc('123').get();

        expect(userRef.data()).toEqual({
            plan: 'free',
            stripeCustomerId: StripeCanceledSubscription.customer
        });
    });

    it('Should fail if the stripeCustomerId does not exists', async () => {
        await helper.setUser({ plan: 'premium', stripeCustomerId: 'cus_invalid123' });

        await expect(updatePlan(StripeSubscription)).rejects.toThrow({ message: "Couldn't find user." });
    });

    afterEach(async () => {
        await helper.clean();
    });
});
