/**
 * @fileoverview OP Stack batch finalization job.
 * Confirms pending batches once parent chain reaches safe block.
 * @module jobs/finalizePendingOpBatches
 */

const logger = require('../lib/logger');
const { OpBatch, OpChainConfig, Workspace } = require('../models');
const { Op } = require('sequelize');
const { withTimeout } = require('../lib/utils');

module.exports = async () => {
    const startTime = Date.now();
    logger.info(`Starting finalizePendingOpBatches job`, { location: 'jobs.finalizePendingOpBatches' });

    const opConfigs = await withTimeout(
        OpChainConfig.findAll({
            include: [{
                model: Workspace,
                as: 'parentWorkspace',
                required: true
            }]
        }),
        15000
    );

    const queryTime = Date.now() - startTime;
    logger.info(`Loaded ${opConfigs.length} OP configs in ${queryTime}ms`, {
        location: 'jobs.finalizePendingOpBatches',
        configCount: opConfigs.length,
        queryTimeMs: queryTime
    });

    let totalConfirmed = 0;

    for (const opConfig of opConfigs) {
        try {
            const parentWorkspace = opConfig.parentWorkspace;
            if (!parentWorkspace || !parentWorkspace.rpcServer) continue;

            const client = parentWorkspace.getViemPublicClient();
            const safeBlock = await withTimeout(
                client.getBlock({ blockTag: 'safe' }),
                15000
            );

            logger.info(`Validating OP batches for workspace ${opConfig.workspaceId} against safe block ${safeBlock.number}`);

            const [confirmedCount] = await withTimeout(
                OpBatch.update(
                    { status: 'confirmed' },
                    {
                        where: {
                            workspaceId: opConfig.workspaceId,
                            status: 'pending',
                            l1BlockNumber: {
                                [Op.lte]: Number(safeBlock.number)
                            }
                        }
                    }
                ),
                10000
            );

            if (confirmedCount > 0)
                logger.info(`Confirmed ${confirmedCount} OP batches for workspace ${opConfig.workspaceId}`);

            totalConfirmed += confirmedCount;
        } catch (error) {
            logger.error(`Error finalizing OP batches for config ${opConfig.id}: ${error.message}`, {
                location: 'jobs.finalizePendingOpBatches',
                error,
                configId: opConfig.id
            });
        }
    }

    const totalTime = Date.now() - startTime;
    logger.info(`Completed finalizePendingOpBatches job`, {
        location: 'jobs.finalizePendingOpBatches',
        totalConfirmed,
        totalTimeMs: totalTime
    });

    return `Confirmed ${totalConfirmed} OP batches in ${totalTime}ms`;
};
