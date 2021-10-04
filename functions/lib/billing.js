const functions = require('firebase-functions');
const stripe = require('stripe')(functions.config().stripe.secret_key);
const { getUserbyStripeCustomerId, getUser } = require('./firebase');

module.exports = {
    updatePlan: async (stripeSubscription) => {
        const user = await getUserbyStripeCustomerId(stripeSubscription.customer);

        if (!user) return false;

        let plan;

        switch (stripeSubscription.status) {
            case 'active':
                plan = 'premium';
                break;
            case 'trialing':
                plan = 'trial';
                break;
            default:
                plan = 'free';
        }

        if (plan) {
            await user.update({ plan: plan })
            return true;
        }
        else
            return false;
    }
};