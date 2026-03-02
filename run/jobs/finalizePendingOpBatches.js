/**
 * @fileoverview OP Stack batch finalization job.
 * Confirms pending batches once parent chain reaches safe block.
 * @module jobs/finalizePendingOpBatches
 */

const logger = require('../lib/logger');
const { OpBatch, OpChainConfig, Workspace } = require('../models');
const { Op } = require('sequelize');

module.exports = async () => {
    // Find all OP child configs and their parent workspaces
    const opConfigs = await OpChainConfig.findAll({
        include: [{
            model: Workspace,
            as: 'parentWorkspace',
            required: true
        }]
    });

    let allConfirmedBatches = [];

    for (const opConfig of opConfigs) {
        try {
            const parentWorkspace = opConfig.parentWorkspace;
            if (!parentWorkspace || !parentWorkspace.rpcServer) continue;

            const client = parentWorkspace.getViemPublicClient();
            const safeBlock = await client.getBlock({ blockTag: 'safe' });

            logger.info(`Validating OP batches for workspace ${opConfig.workspaceId} against safe block ${safeBlock.number}`);

            const pendingBatches = await OpBatch.findAll({
                where: {
                    workspaceId: opConfig.workspaceId,
                    status: 'pending',
                    l1BlockNumber: {
                        [Op.lte]: Number(safeBlock.number)
                    }
                }
            });

            for (const batch of pendingBatches) {
                await batch.update({ status: 'confirmed' });
                logger.info(`Confirmed OP batch ${batch.batchIndex} for workspace ${opConfig.workspaceId}`);
            }

            allConfirmedBatches = allConfirmedBatches.concat(pendingBatches);
        } catch (error) {
            logger.error(`Error finalizing OP batches for config ${opConfig.id}: ${error.message}`, {
                location: 'jobs.finalizePendingOpBatches',
                error,
                configId: opConfig.id
            });
        }
    }

    return `Confirmed ${allConfirmedBatches.length} OP batches`;
};
