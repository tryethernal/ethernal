/**
 * @fileoverview Stripe billing quota job.
 * Increments transaction quota and reports metered billing usage.
 * @module jobs/increaseStripeBillingQuota
 */

const { getStripeSecretKey } = require('../lib/env');
const stripe = require('stripe')(getStripeSecretKey());
const { Block, Workspace, Explorer, StripeSubscription, Transaction } = require('../models');

module.exports = async job => {
    const data = job.data;

    if (!data.blockId)
        return 'Missing parameter';

    // First: Get block with minimal data, including transactionsCount
    const block = await Block.findByPk(data.blockId, {
        attributes: ['id', 'isReady', 'transactionsCount', 'workspaceId'],
        include: {
            model: Workspace,
            as: 'workspace',
            attributes: ['id'],
            include: {
                model: Explorer,
                as: 'explorer',
                attributes: ['id'],
                include: {
                    model: StripeSubscription,
                    as: 'stripeSubscription',
                    attributes: ['id', 'stripeId', 'transactionQuota'],
                    include: {
                        model: require('../models').StripePlan,
                        as: 'stripePlan',
                        attributes: ['capabilities']
                    }
                }
            }
        }
    });

    if (!block)
        return 'Cannot find block';

    if (!block.isReady)
        return 'Block is not ready';

    // Get transaction count - use transactionsCount field if available, otherwise query
    let transactionCount = block.transactionsCount;
    if (!transactionCount) {
        transactionCount = await Transaction.count({
            where: { blockId: block.id }
        });
    }

    if (!transactionCount || transactionCount === 0)
        return 'Block is empty';

    if (!block.workspace.explorer)
        return 'No explorer';

    const stripeSubscription = block.workspace.explorer.stripeSubscription;

    if (!stripeSubscription)
        return 'No active subscription';

    await stripeSubscription.increment('transactionQuota', { by: transactionCount });

    if (stripeSubscription.stripePlan.capabilities.billing == 'metered') {
        const subscription = await stripe.subscriptions.retrieve(stripeSubscription.stripeId);
        await stripe.subscriptionItems.createUsageRecord(subscription.items.data[0].id, {
            quantity: transactionCount
        }, { idempotencyKey: block.id });
    }

    return true;
};
