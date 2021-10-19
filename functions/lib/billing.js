const functions = require('firebase-functions');
const moment = require('moment');
const stripe = require('stripe')(functions.config().stripe.secret_key);
const { getUserbyStripeCustomerId, getUser } = require('./firebase');
const { sanitize } = require('./utils');

module.exports = {
    updatePlan: async (stripeSubscription) => {
        const user = await getUserbyStripeCustomerId(stripeSubscription.customer);

        if (!user)
            throw new Error("Couldn't find user.");

        let plan;

        switch (stripeSubscription.status) {
            case 'active':
                plan = 'premium';
                break;
            case 'trialing':
                plan = 'premium';
                break;
            case 'canceled':
                plan = 'free';
                break;
            default:
                plan = 'free';
        }

        if (plan) {
            const formattedTrialEnd = stripeSubscription.trial_end ? moment.unix(stripeSubscription.trial_end).format() : null;
            await user.update(sanitize({ plan: plan, trialEndsAt: formattedTrialEnd }));
            return true;
        }
        else
            throw new Error("Couldn't update plan.");
    }
};
