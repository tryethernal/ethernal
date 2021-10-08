const functions = require('firebase-functions');
const stripe = require('stripe')(functions.config().stripe.secret_key);
const { getUserbyStripeCustomerId, getUser } = require('./firebase');
const { updatePlan } = require('./billing');

module.exports = {
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

                const subscription = await stripe.subscriptions.update(subscriptionId, {
                    default_payment_method: paymentIntent.payment_method
                });
            }
            else {
                subscription = await stripe.subscriptions.retrieve(subscriptionId);
            }

            if (subscription)
                await updatePlan(subscription);
        }
    }
};