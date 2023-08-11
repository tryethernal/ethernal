const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Analytics = require('./analytics');
const db = require('./firebase');
const models = require('../models');
const analytics = new Analytics(process.env.MIXPANEL_API_TOKEN);

const deleteExplorerSubscription = async (stripeSubscription) => {
    if (stripeSubscription.status != 'canceled')
        return 'Subscription is not canceled';

    const explorerId = parseInt(stripeSubscription.metadata.explorerId);
    if (!explorerId)
        return 'Invalid explorer id';

    const user = await db.getUserbyStripeCustomerId(stripeSubscription.customer);
    if (!user)
        return 'Cannot find user';

    const explorer = await db.getExplorerById(user.id, explorerId);

    if (!explorer || !explorer.stripeSubscription || explorer.stripeSubscription.stripeId != stripeSubscription.id)
        return 'Cannot find explorer';

    await db.deleteExplorerSubscription(user.id, explorerId, stripeSubscription.id);
}

const updateExplorerSubscription = async (stripeSubscription) => {
    if (stripeSubscription.status != 'active')
        return 'Inactive subscription';

    const explorerId = parseInt(stripeSubscription.metadata.explorerId);
    if (!explorerId)
        return 'Invalid explorer id';

    const user = await db.getUserbyStripeCustomerId(stripeSubscription.customer);
    if (!user)
        return 'Cannot find user';

    const explorer = await db.getExplorerById(user.id, explorerId);
    if (!explorer)
        return 'Cannot find explorer';

    if (stripeSubscription.cancel_at_period_end == true) {
        await db.cancelExplorerSubscription(user.id, explorerId);
        return 'Subscription canceled';
    }

    const priceId = stripeSubscription.items.data[0].price.id;
    const stripePlan = await models.StripePlan.findOne({ where: { stripePriceId: priceId }});

    if (!stripePlan)
        return 'Cannot find plan';

    if (explorer.stripeSubscription) {
        if (explorer.stripeSubscription.isPendingCancelation && stripeSubscription.cancel_at_period_end == false)
            await db.revertExplorerSubscriptionCancelation(user.id, explorerId);
        else {
            // This is where we should check if the subscription is still active on Stripe, and cancel the subscription if not
            if (stripeSubscription.status == 'active')
                await db.updateExplorerSubscription(user.id, explorerId, stripePlan.id, new Date(stripeSubscription.current_period_end * 1000));
        }
    } else
        await db.createExplorerSubscription(user.id, explorerId, stripePlan.id, stripeSubscription.id, new Date(stripeSubscription.current_period_end * 1000));
}

const updatePlan = async (stripeSubscription) => {
    const user = await db.getUserbyStripeCustomerId(stripeSubscription.customer);

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
        await db.updateUserPlan(user.firebaseUserId, plan);
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

module.exports = {
    handleStripeSubscriptionUpdate: async (data) => {
        if (data.metadata.explorerId)
            return await updateExplorerSubscription(data);
        else
            await updatePlan(data);
    },

    handleStripeSubscriptionDeletion: async (data) => {
        if (data.metadata.explorerId)
            return await deleteExplorerSubscription(data);
        else
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
};
