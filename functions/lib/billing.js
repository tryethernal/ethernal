const functions = require('firebase-functions');
const moment = require('moment');
const stripe = require('stripe')(functions.config().stripe.secret_key);
const { getUserbyStripeCustomerId, getUser } = require('./firebase');
const { sanitize } = require('./utils');
const Analytics = require('./analytics');

const analytics = new Analytics(process.env.ENABLE_BACKEND_ANALYTICS ? functions.config().mixpanel.token : null);

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
            analytics.track(user.id, 'Subscription Change', {
                plan: plan,
                trialEndsAt: formattedTrialEnd,
                subscriptionStatus: stripeSubscription.status,
                cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end
            });
            analytics.setSubscription(user.id, stripeSubscription.status, plan, formattedTrialEnd, stripeSubscription.cancel_at_period_end);
            return true;
        }
        else
            throw new Error("Couldn't update plan.");
    }
};
