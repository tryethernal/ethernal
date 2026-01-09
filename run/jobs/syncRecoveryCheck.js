/**
 * @fileoverview Sync recovery check job.
 * Periodically checks auto-disabled explorers to see if their RPC has recovered.
 * Re-enables sync when RPC becomes reachable, using exponential backoff for retries.
 *
 * Backoff schedule: 5m -> 15m -> 1h -> 6h (max)
 *
 * @module jobs/syncRecoveryCheck
 */

const { Explorer, Workspace } = require('../models');
const { ProviderConnector } = require('../lib/rpc');
const { withTimeout } = require('../lib/utils');
const { Op } = require('sequelize');
const logger = require('../lib/logger');

module.exports = async () => {
    // Find explorers that are due for a recovery check
    const explorers = await Explorer.findAll({
        where: {
            syncDisabledReason: { [Op.ne]: null },
            nextRecoveryCheckAt: { [Op.lte]: new Date() }
        },
        include: [{
            model: Workspace,
            as: 'workspace',
            attributes: ['id', 'rpcServer']
        }]
    });

    if (explorers.length === 0) {
        return 'No explorers due for recovery check';
    }

    let recovered = 0;
    let stillUnreachable = 0;

    for (const explorer of explorers) {
        try {
            const provider = new ProviderConnector(explorer.workspace.rpcServer);
            const block = await withTimeout(provider.fetchLatestBlock());

            if (block) {
                // RPC is reachable - re-enable sync
                await explorer.enableSyncAfterRecovery();
                recovered++;

                logger.info({
                    message: 'Explorer re-enabled after RPC recovery',
                    explorerId: explorer.id,
                    explorerSlug: explorer.slug,
                    disabledReason: explorer.syncDisabledReason
                });
            } else {
                // Block fetch returned null - still unreachable
                await explorer.scheduleNextRecoveryCheck();
                stillUnreachable++;
            }
        } catch (error) {
            // RPC check failed - schedule next check with backoff
            await explorer.scheduleNextRecoveryCheck();
            stillUnreachable++;

            logger.debug({
                message: 'Explorer recovery check failed',
                explorerId: explorer.id,
                explorerSlug: explorer.slug,
                error: error.message
            });
        }
    }

    return `Checked ${explorers.length} explorers: ${recovered} recovered, ${stillUnreachable} still unreachable`;
};
