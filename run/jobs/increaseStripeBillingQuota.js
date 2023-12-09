const { getStripeSecretKey } = require('../lib/env');
const stripe = require('stripe')(getStripeSecretKey());
const { Block, Workspace, Explorer, StripeSubscription } = require('../models');

module.exports = async job => {
    const data = job.data;

    if (!data.blockId)
        return 'Missing parameter';

    const block = await Block.findByPk(data.blockId, {
        include: [
            {
                model: Workspace,
                as: 'workspace',
                include: {
                    model: Explorer,
                    as: 'explorer',
                    include: {
                        model: StripeSubscription,
                        as: 'stripeSubscription',
                        include: 'stripePlan'
                    }
                }
            },
            'transactions'
        ]
    });

    if (!block)
        return 'Cannot find block';

    if (!block.isReady)
        return 'Block is not ready';

    if (!block.transactions.length)
        return 'Block is empty';

    if (!block.workspace.explorer)
        return 'No explorer';

    const stripeSubscription = block.workspace.explorer.stripeSubscription;

    if (!stripeSubscription)
        return 'No active subscription';

    await stripeSubscription.increment('transactionQuota', { by: block.transactions.length });

    if (stripeSubscription.stripePlan.capabilities.billing == 'metered') {
        const subscription = await stripe.subscriptions.retrieve(stripeSubscription.stripeId);
        await stripe.subscriptionItems.createUsageRecord(subscription.items.data[0].id, {
            quantity: block.transactions.length
        }, { idempotencyKey: block.id });
    }

    return true;
};
