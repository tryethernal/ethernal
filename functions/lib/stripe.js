const functions = require('firebase-functions');
const stripe = require('stripe')(functions.config().stripe.secret_key);
const moment = require('moment');
const { sanitize } = require('./utils');
const Analytics = require('./analytics');
const analytics = new Analytics(functions.config().mixpanel ? functions.config().mixpanel.token : null);
let db;

const updatePlan = async (stripeSubscription) => {
    const user = await db.getUserbyStripeCustomerId(stripeSubscription.customer);

    const userId = user.firebaseUserId || user.id;

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
        await db.updateUserPlan(userId, plan);
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

module.exports = (loadedDb) => {
    db = db || loadedDb;

    return {
        handleStripeSubscriptionUpdate: async (data) => {
            await updatePlan(data);
        },

        handleStripeSubscriptionDeletion: async (data) => {
            await updatePlan(data);
        },

        handleStripePaymentSucceeded: async (data) => {
            if (data.billing_reason == 'subscription_create') {
                const subscriptionId = data.subscription;
                const paymentIntentId = data.payment_intent;
                let subscription;

                if (paymentIntentId) {
                    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

                    subscription = await stripe.subscriptions.update(subscriptionId, {
                        default_payment_method: paymentIntent.payment_method
                    });
                }
                else {
                    subscription = await stripe.subscriptions.retrieve(subscriptionId);
                }

                if (subscription) {
                    await updatePlan(subscription);
                    return true;
                }

                return false;
            }
        }
    }
};
