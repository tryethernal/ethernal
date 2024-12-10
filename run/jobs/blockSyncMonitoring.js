const { Sequelize } = require('sequelize');
const { Explorer, StripeSubscription, StripePlan, Workspace } = require('../models');
const logger = require('../lib/logger');
const { withTimeout } = require('../lib/utils');
const { createIncident } = require('../lib/opsgenie');
const { maxBlockNumberDiff } = require('../lib/env');

module.exports = async () => {
    const explorers = await Explorer.findAll({
        where: {
            shouldSync: true,
            '$stripeSubscription.status$': 'active',
            '$stripeSubscription.stripePlan.slug$': { [Sequelize.Op.not]: 'demo' },
        },
        include: [
            {
                model: StripeSubscription,
                as: 'stripeSubscription',
                include: {
                    model: StripePlan,
                    as: 'stripePlan'
                }
            },
            {
                model: Workspace,
                as: 'workspace',
                include: 'rpcHealthCheck'
            }
        ]
    });

    for (const explorer of explorers) {
        if (explorer.workspace.rpcHealthCheck && !explorer.workspace.rpcHealthCheck.isReachable)
            continue;

        const [latestLocalBlock] = await explorer.workspace.getBlocks({
            order: [['number', 'DESC']],
            limit: 1
        });

        if (!latestLocalBlock)
            continue;

        const provider = explorer.workspace.getProvider();
        let latestRemoteBlock;

        try {
            latestRemoteBlock = await withTimeout(provider.fetchLatestBlock());
        } catch (_error) {
            logger.info(`Couldn't reach network for blockSyncMonitoring`, { id: explorer.id, name: explorer.name });
            continue;
        }

        const blockNumberDiff = parseInt(latestRemoteBlock.number) - parseInt(latestLocalBlock.number);

        if (blockNumberDiff >= maxBlockNumberDiff())
            await createIncident(`Block sync is behind`, `Explorer: ${explorer.name} (#${explorer.id}) - Diff: ${blockNumberDiff} - Remote: ${latestRemoteBlock.number} - Local: ${latestLocalBlock.number}`);
        else
            logger.info(`Block sync is OK`, { id: explorer.id, name: explorer.name, diff: parseInt(latestRemoteBlock.number) - parseInt(latestLocalBlock.number) });
    }
};

