/**
 * @fileoverview OP Stack batch finalization job.
 * Confirms pending batches once parent chain reaches safe block.
 * @module jobs/finalizePendingOpBatches
 */

const logger = require('../lib/logger');
const { OpBatch, OpChainConfig, Workspace } = require('../models');
const { Op } = require('sequelize');
const { withTimeout } = require('../lib/utils');

// Simple in-memory job overlap prevention
let isJobRunning = false;

module.exports = async () => {
    // Prevent overlapping job executions
    if (isJobRunning) {
        logger.debug('OP batch finalization job already running, skipping this execution');
        return 'Skipped - job already running';
    }

    isJobRunning = true;
    let totalConfirmed = 0;

    try {
        // Find all OP child configs with timeout protection (20s timeout, well under job frequency)
        const opConfigs = await withTimeout(
            OpChainConfig.findAll({
                include: [{
                    model: Workspace,
                    as: 'parentWorkspace',
                    required: true
                }]
            }),
            20000 // 20 second timeout
        );

        for (const opConfig of opConfigs) {
            try {
                const parentWorkspace = opConfig.parentWorkspace;
                if (!parentWorkspace || !parentWorkspace.rpcServer) continue;

                // Add timeout for external RPC calls (15s timeout)
                const client = parentWorkspace.getViemPublicClient();
                const safeBlock = await withTimeout(
                    client.getBlock({ blockTag: 'safe' }),
                    15000
                );

                logger.info(`Validating OP batches for workspace ${opConfig.workspaceId} against safe block ${safeBlock.number}`);

                // Add timeout for database update operation (10s timeout)
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

        return `Confirmed ${totalConfirmed} OP batches`;
    } catch (error) {
        logger.error(`Critical error in OP batch finalization job: ${error.message}`, {
            location: 'jobs.finalizePendingOpBatches',
            error
        });
        throw error; // Re-throw to let BullMQ handle retries
    } finally {
        isJobRunning = false; // Always reset the flag
    }
};
