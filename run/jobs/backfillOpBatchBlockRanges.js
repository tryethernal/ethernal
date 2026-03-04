/**
 * @fileoverview Backfill job for OP batch block ranges.
 * Uses sequential approach like Blockscout - each batch covers a contiguous
 * range of L2 blocks. Block ranges are calculated by distributing L2 blocks
 * proportionally across batches based on their timestamps.
 * @module jobs/backfillOpBatchBlockRanges
 */

const { OpBatch, OpChainConfig, Block, sequelize } = require('../models');
const { Op } = require('sequelize');
const logger = require('../lib/logger');

// Process batches in chunks to avoid memory issues with large datasets
const BATCH_CHUNK_SIZE = 1000;

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
                // Get total batch count for this workspace
                const totalBatches = await OpBatch.count({
                    where: { workspaceId: opConfig.workspaceId }
                });

                if (totalBatches === 0) {
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

                logger.info(`Backfilling ${totalBatches} batches for workspace ${opConfig.workspaceId}, latest L2 block: ${latestBlockNumber}`, { location: 'jobs.backfillOpBatchBlockRanges' });

                // Calculate average blocks per batch
                const avgBlocksPerBatch = Math.ceil((latestBlockNumber + 1) / totalBatches);

                let currentBlockStart = 0;
                let updated = 0;
                let processedCount = 0;

                // Process batches in chunks to avoid memory issues
                while (processedCount < totalBatches) {
                    const batches = await OpBatch.findAll({
                        where: { workspaceId: opConfig.workspaceId },
                        order: [['batchIndex', 'ASC']],
                        limit: BATCH_CHUNK_SIZE,
                        offset: processedCount
                    });

                    if (batches.length === 0) break;

                    // Collect updates for bulk flush
                    const pendingUpdates = [];

                    for (let i = 0; i < batches.length; i++) {
                        const batch = batches[i];
                        const globalIndex = processedCount + i;

                        // Skip if already has block range
                        if (batch.l2BlockStart !== null && batch.l2BlockEnd !== null) {
                            currentBlockStart = batch.l2BlockEnd + 1;
                            continue;
                        }

                        let l2BlockEnd;
                        if (globalIndex === totalBatches - 1) {
                            l2BlockEnd = latestBlockNumber;
                        } else {
                            l2BlockEnd = Math.min(currentBlockStart + avgBlocksPerBatch - 1, latestBlockNumber);
                        }

                        if (currentBlockStart > latestBlockNumber) {
                            logger.warn(`Batch ${batch.batchIndex} start block ${currentBlockStart} exceeds latest L2 block ${latestBlockNumber}`, { location: 'jobs.backfillOpBatchBlockRanges' });
                            totalFailed++;
                            continue;
                        }

                        const txCount = l2BlockEnd - currentBlockStart + 1;
                        pendingUpdates.push({ id: batch.id, l2BlockStart: currentBlockStart, l2BlockEnd, txCount });
                        currentBlockStart = l2BlockEnd + 1;
                        updated++;
                    }

                    // Bulk update using raw SQL with VALUES for efficiency
                    if (pendingUpdates.length > 0) {
                        const values = pendingUpdates.map(u =>
                            `(${u.id}, ${u.l2BlockStart}, ${u.l2BlockEnd}, ${u.txCount})`
                        ).join(', ');
                        await sequelize.query(`
                            UPDATE op_batches AS b SET
                                "l2BlockStart" = v.l2_block_start,
                                "l2BlockEnd" = v.l2_block_end,
                                "txCount" = v.tx_count
                            FROM (VALUES ${values}) AS v(id, l2_block_start, l2_block_end, tx_count)
                            WHERE b.id = v.id
                        `);
                    }

                    processedCount += batches.length;
                    logger.info(`Processed ${processedCount}/${totalBatches} batches for workspace ${opConfig.workspaceId}`, { location: 'jobs.backfillOpBatchBlockRanges' });
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
