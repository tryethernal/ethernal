/**
 * @fileoverview Stripe billing quota job.
 * Increments transaction quota and reports metered billing usage.
 * @module jobs/increaseStripeBillingQuota
 */

const { getStripeSecretKey } = require('../lib/env');
const stripe = require('stripe')(getStripeSecretKey());
const { Block, Workspace, Explorer, StripeSubscription, Transaction, StripePlan } = require('../models');

module.exports = async job => {
    const data = job.data;

    if (!data.blockId)
        return 'Missing parameter';

    // Step 1: Get block with minimal data
    // Use workspaceId in query for better performance on hypertables (partition pruning)
    // Fallback to findByPk for backward compatibility with existing job data
    const block = data.workspaceId
        ? await Block.findOne({
            where: { id: data.blockId, workspaceId: data.workspaceId },
            attributes: ['id', 'isReady', 'transactionsCount', 'workspaceId']
        })
        : await Block.findByPk(data.blockId, {
            attributes: ['id', 'isReady', 'transactionsCount', 'workspaceId']
        });

    if (!block)
        return 'Cannot find block';

    if (!block.isReady)
        return 'Block is not ready';

    // Get transaction count - use transactionsCount field if available, otherwise query
    let transactionCount = block.transactionsCount;
    if (transactionCount == null) {
        transactionCount = await Transaction.count({
            where: { blockId: block.id }
        });
    }

    if (!transactionCount)
        return 'Block is empty';

    // Step 2: Get explorer for this workspace
    const explorer = await Explorer.findOne({
        where: { workspaceId: block.workspaceId },
        attributes: ['id']
    });

    if (!explorer)
        return 'No explorer';

    // Step 3: Get stripe subscription for this explorer
    const stripeSubscription = await StripeSubscription.findOne({
        where: { explorerId: explorer.id },
        attributes: ['id', 'stripeId', 'transactionQuota', 'stripePlanId']
    });

    if (!stripeSubscription)
        return 'No active subscription';

    // Step 4: Get stripe plan capabilities
    const stripePlan = await StripePlan.findByPk(stripeSubscription.stripePlanId, {
        attributes: ['capabilities']
    });

    if (!stripePlan)
        return 'No stripe plan found';

    await stripeSubscription.increment('transactionQuota', { by: transactionCount });

    if (stripePlan.capabilities.billing == 'metered') {
        const subscription = await stripe.subscriptions.retrieve(stripeSubscription.stripeId);
        await stripe.subscriptionItems.createUsageRecord(subscription.items.data[0].id, {
            quantity: transactionCount
        }, { idempotencyKey: block.id });
    }

    return true;
};
