/**
 * @fileoverview Block sync monitoring job.
 * Checks if explorers are falling behind and creates OpsGenie alerts.
 * @module jobs/blockSyncMonitoring
 */

const { Sequelize } = require('sequelize');
const { Explorer, StripeSubscription, StripePlan, StripeQuotaExtension, Workspace, IntegrityCheck } = require('../models');
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
                include: [
                    { model: StripePlan, as: 'stripePlan' },
                    { model: StripeQuotaExtension, as: 'stripeQuotaExtension', required: false }
                ]
            },
            {
                model: Workspace,
                as: 'workspace',
                include: [
                    'rpcHealthCheck',
                    {
                        model: IntegrityCheck,
                        as: 'integrityCheck',
                        attributes: ['status'],
                        required: false
                    }
                ]
            }
        ]
    });

    for (const explorer of explorers) {
        if (explorer.workspace.rpcHealthCheck && !explorer.workspace.rpcHealthCheck.isReachable)
            continue;

        if (await explorer.hasReachedTransactionQuota())
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
            await createIncident(
                `Block sync is behind`,
                `Explorer: ${explorer.name} (#${explorer.id}) - Diff: ${blockNumberDiff} - Remote: ${latestRemoteBlock.number} - Local: ${latestLocalBlock.number}`,
                'P1',
                { alias: `block-sync-behind-${explorer.id}` }
            );
        else
            logger.info(`Block sync is OK`, { id: explorer.id, name: explorer.name, diff: parseInt(latestRemoteBlock.number) - parseInt(latestLocalBlock.number) });

        // Alert when explorer is in recovery mode — cli-light sync has stopped
        // and the integrity check is backfilling blocks
        if (explorer.workspace.integrityCheck && explorer.workspace.integrityCheck.status === 'recovering')
            await createIncident(
                `Explorer in recovery mode`,
                `Explorer: ${explorer.name} (#${explorer.id}) - Real-time sync (cli-light) has stopped, integrity check is backfilling`,
                'P2',
                { alias: `recovery-mode-${explorer.id}` }
            );
    }
};

