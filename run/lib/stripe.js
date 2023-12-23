const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Analytics = require('./analytics');
const db = require('./firebase');
const models = require('../models');
const analytics = new Analytics();

const renewSubscriptionCycle = async (stripeInvoice) => {
    if (stripeInvoice.billing_reason != 'subscription_cycle' && stripeInvoice.billing_reason != 'subscription_create')
        return 'Subscription is not renewing';

    const explorerId = parseInt(stripeInvoice.subscription_details.metadata.explorerId);
    if (!explorerId)
        return 'Invalid explorer id';

    const user = await db.getUserbyStripeCustomerId(stripeInvoice.customer);
    if (!user)
        return 'Cannot find user';

    const explorer = await models.Explorer.findByPk(explorerId, { include: ['stripeSubscription', 'workspace']});
    if (!explorer)
        return 'Cannot find explorer';

    if (!explorer.stripeSubscription)
        return 'No active subscription';

    await db.resetExplorerTransactionQuota(user.id, explorer.id);
};

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

    await db.deleteExplorerSubscription(user.id, explorerId, stripeSubscription.stripeId);
}

const updateExplorerSubscription = async (stripeSubscription) => {
    if (['active', 'trialing'].indexOf(stripeSubscription.status) == -1)
        return 'Inactive subscription';

    const explorerId = parseInt(stripeSubscription.metadata.explorerId);
    if (!explorerId)
        return 'Invalid explorer id';

    const user = await db.getUserbyStripeCustomerId(stripeSubscription.customer);
    if (!user)
        return 'Cannot find user';

    const explorer = await models.Explorer.findByPk(explorerId, { include: ['stripeSubscription', 'workspace']});
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
    
    const stripeCustomer = await stripe.customers.retrieve(stripeSubscription.customer);

    if (explorer.stripeSubscription) {
        if (explorer.isDemo && !explorer.stripeSubscription.stripeId) {
            await db.migrateDemoExplorer(explorer.id, user.id, stripeSubscription);
            analytics.track(user.id, 'explorer:demo_migrate', {
                is_trial: stripeSubscription.status == 'trialing',
                plan_slug: stripePlan.slug
            });
        }
        if (explorer.stripeSubscription.isPendingCancelation && stripeSubscription.cancel_at_period_end == false)
            await db.revertExplorerSubscriptionCancelation(user.id, explorerId);
        else
            await db.updateExplorerSubscription(user.id, explorerId, stripePlan.id, { ...stripeSubscription, customer: stripeCustomer });
    } else
        await db.createExplorerSubscription(user.id, explorerId, stripePlan.id, { ...stripeSubscription, customer: stripeCustomer });

    if (stripeSubscription.status == 'trialing')
        await db.disableUserTrial(user.id);
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
                if (subscription.metadata && subscription.metadata.explorerId)
                    return await renewSubscriptionCycle(data); // This means trial is ending and subscription is starting
                else
                    return await updatePlan(subscription); // Premium plan creation/renewing
            }

            return false;
        }
        else if (data.billing_reason == 'subscription_cycle') {
            return await renewSubscriptionCycle(data);
        }
    }
};
