const functions = require('firebase-functions');
const moment = require('moment');
const stripe = require('stripe')(functions.config().stripe.secret_key);
const { getUserbyStripeCustomerId, getUser } = require('./firebase');
const { sanitize } = require('./utils');
const Analytics = require('./analytics');

const analytics = new Analytics(functions.config().mixpanel ? functions.config().mixpanel.token : null);

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
            case 'canceled':
                plan = 'free';
                break;
            default:
                plan = 'free';
        }

        if (plan) {
            await user.update(sanitize({ plan: plan }));
            analytics.track(user.id, 'Subscription Change', {
                plan: plan,
                subscriptionStatus: stripeSubscription.status,
                cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end
            });
            analytics.setSubscription(user.id, stripeSubscription.status, plan, stripeSubscription.cancel_at_period_end);
            return true;
        }
        else
            throw new Error("Couldn't update plan.");
    }
};
