/**
 * @fileoverview Backfill job for OP batch block ranges.
 * Uses sequential approach like Blockscout - each batch covers a contiguous
 * range of L2 blocks. Block ranges are calculated by distributing L2 blocks
 * proportionally across batches based on their timestamps.
 * @module jobs/backfillOpBatchBlockRanges
 */

const { OpBatch, OpChainConfig, Block } = require('../models');
const { Op } = require('sequelize');
const logger = require('../lib/logger');

module.exports = async job => {
    const data = job.data || {};
    const { workspaceId } = data;

    try {
        // Get all OP chain configs (or specific one if workspaceId provided)
        const configWhere = workspaceId ? { workspaceId } : {};
        const opConfigs = await OpChainConfig.findAll({ where: configWhere });

        if (opConfigs.length === 0) {
            return 'No OP chain configs found';
        }

        let totalUpdated = 0;
        let totalFailed = 0;

        for (const opConfig of opConfigs) {
            try {
                // Get all batches for this workspace, ordered by batchIndex
                const batches = await OpBatch.findAll({
                    where: { workspaceId: opConfig.workspaceId },
                    order: [['batchIndex', 'ASC']]
                });

                if (batches.length === 0) {
                    logger.info(`No batches found for workspace ${opConfig.workspaceId}`, { location: 'jobs.backfillOpBatchBlockRanges' });
                    continue;
                }

                // Get the latest L2 block for this workspace
                const latestL2Block = await Block.findOne({
                    where: { workspaceId: opConfig.workspaceId },
                    order: [['number', 'DESC']],
                    attributes: ['number']
                });

                if (!latestL2Block) {
                    logger.info(`No L2 blocks found for workspace ${opConfig.workspaceId}`, { location: 'jobs.backfillOpBatchBlockRanges' });
                    continue;
                }

                const latestBlockNumber = latestL2Block.number;
                const batchCount = batches.length;

                logger.info(`Backfilling ${batchCount} batches for workspace ${opConfig.workspaceId}, latest L2 block: ${latestBlockNumber}`, { location: 'jobs.backfillOpBatchBlockRanges' });

                // Calculate block ranges for each batch
                // Approach: Distribute blocks proportionally across batches
                // Each batch covers: (latestBlockNumber + 1) / batchCount blocks on average
                const avgBlocksPerBatch = Math.ceil((latestBlockNumber + 1) / batchCount);

                let currentBlockStart = 0;
                let updated = 0;

                for (let i = 0; i < batches.length; i++) {
                    const batch = batches[i];

                    // Skip if already has block range
                    if (batch.l2BlockStart !== null && batch.l2BlockEnd !== null) {
                        currentBlockStart = batch.l2BlockEnd + 1;
                        continue;
                    }

                    // Calculate end block for this batch
                    let l2BlockEnd;
                    if (i === batches.length - 1) {
                        // Last batch gets all remaining blocks
                        l2BlockEnd = latestBlockNumber;
                    } else {
                        // Use average, but make sure we don't exceed the latest block
                        l2BlockEnd = Math.min(currentBlockStart + avgBlocksPerBatch - 1, latestBlockNumber);
                    }

                    // Ensure valid range
                    if (currentBlockStart > latestBlockNumber) {
                        logger.warn(`Batch ${batch.batchIndex} start block ${currentBlockStart} exceeds latest L2 block ${latestBlockNumber}`, { location: 'jobs.backfillOpBatchBlockRanges' });
                        totalFailed++;
                        continue;
                    }

                    const txCount = l2BlockEnd - currentBlockStart + 1;

                    await batch.update({
                        l2BlockStart: currentBlockStart,
                        l2BlockEnd: l2BlockEnd,
                        txCount: txCount
                    });

                    logger.info(`Updated batch ${batch.batchIndex}: blocks ${currentBlockStart}-${l2BlockEnd} (${txCount} blocks)`, { location: 'jobs.backfillOpBatchBlockRanges' });

                    currentBlockStart = l2BlockEnd + 1;
                    updated++;
                }

                totalUpdated += updated;
                logger.info(`Workspace ${opConfig.workspaceId}: Updated ${updated} batches`, { location: 'jobs.backfillOpBatchBlockRanges' });

            } catch (error) {
                logger.error(`Error processing workspace ${opConfig.workspaceId}: ${error.message}`, { location: 'jobs.backfillOpBatchBlockRanges', error });
                totalFailed++;
            }
        }

        return `Backfilled ${totalUpdated} batches, ${totalFailed} failed`;
    } catch (error) {
        logger.error(`Backfill job failed: ${error.message}`, { location: 'jobs.backfillOpBatchBlockRanges', error });
        throw error;
    }
};
