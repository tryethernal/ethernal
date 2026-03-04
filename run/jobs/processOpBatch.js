/**
 * @fileoverview OP batch processing job.
 * Extracted from blockSync to avoid blocking the critical sync path.
 * Handles batch detection, block range calculation, and storage.
 * @module jobs/processOpBatch
 */

const { OpBatch, Block, sequelize } = require('../models');
const logger = require('../lib/logger');
const { getBatchInfo } = require('../lib/opBatches');

/**
 * Processes a single OP batch transaction.
 *
 * @param {Object} job - BullMQ job
 * @param {Object} job.data - Job data
 * @param {Object} job.data.tx - Raw transaction data from block
 * @param {number} job.data.opConfigWorkspaceId - L2 workspace ID
 * @param {string} job.data.batchInboxAddress - Batch inbox contract address
 * @param {string} [job.data.beaconUrl] - Beacon chain URL for blob data
 * @param {number} [job.data.l2BlockTime] - L2 block time in seconds
 * @param {number} [job.data.l2GenesisTimestamp] - L2 genesis timestamp
 * @param {number} job.data.l1Timestamp - L1 block timestamp
 * @param {number} [job.data.l1TransactionId] - L1 transaction record ID
 * @returns {Promise<string>} Result message
 */
module.exports = async job => {
    const data = job.data;

    if (!data.tx || !data.opConfigWorkspaceId || !data.batchInboxAddress)
        return 'Missing parameters';

    const tx = data.tx;

    try {
        const batchInfo = await getBatchInfo(tx, {
            batchInboxAddress: data.batchInboxAddress,
            beaconUrl: data.beaconUrl,
            workspaceId: data.opConfigWorkspaceId,
            l1Timestamp: data.l1Timestamp,
            l2BlockTime: data.l2BlockTime || 2,
            l2GenesisTimestamp: data.l2GenesisTimestamp
        });

        if (!batchInfo)
            return 'No batch info detected';

        await sequelize.transaction(async (t) => {
            const lastBatch = await OpBatch.findOne({
                where: { workspaceId: data.opConfigWorkspaceId },
                order: [['batchIndex', 'DESC']],
                lock: t.LOCK.UPDATE,
                transaction: t
            });
            const nextBatchIndex = lastBatch ? lastBatch.batchIndex + 1 : 0;

            const l1BlockNumber = typeof batchInfo.l1BlockNumber === 'string' && batchInfo.l1BlockNumber.startsWith('0x')
                ? parseInt(batchInfo.l1BlockNumber, 16)
                : Number(batchInfo.l1BlockNumber);
            const l1TransactionIndex = typeof batchInfo.l1TransactionIndex === 'string' && batchInfo.l1TransactionIndex.startsWith('0x')
                ? parseInt(batchInfo.l1TransactionIndex, 16)
                : Number(batchInfo.l1TransactionIndex);

            let l2BlockStart = batchInfo.l2BlockStart;
            let l2BlockEnd = batchInfo.l2BlockEnd;
            let txCount = batchInfo.blockCount;

            if (l2BlockStart === null) {
                const latestL2Block = await Block.findOne({
                    where: { workspaceId: data.opConfigWorkspaceId },
                    order: [['number', 'DESC']],
                    attributes: ['number'],
                    transaction: t
                });

                if (latestL2Block) {
                    l2BlockEnd = latestL2Block.number;

                    if (lastBatch && lastBatch.l2BlockEnd !== null) {
                        l2BlockStart = lastBatch.l2BlockEnd + 1;
                    } else {
                        l2BlockStart = 0;
                    }

                    txCount = l2BlockEnd - l2BlockStart + 1;
                    logger.info(`Calculated L2 block range for batch ${nextBatchIndex}: ${l2BlockStart}-${l2BlockEnd} (${txCount} blocks)`, { location: 'jobs.processOpBatch' });
                }
            }

            await OpBatch.create({
                workspaceId: data.opConfigWorkspaceId,
                batchIndex: nextBatchIndex,
                l1BlockNumber: l1BlockNumber,
                l1TransactionHash: batchInfo.l1TransactionHash,
                l1TransactionId: data.l1TransactionId || null,
                l1TransactionIndex: l1TransactionIndex,
                epochNumber: l1BlockNumber,
                timestamp: tx.timestamp ? new Date(tx.timestamp * 1000) : new Date(),
                txCount: txCount,
                l2BlockStart: l2BlockStart,
                l2BlockEnd: l2BlockEnd,
                blobHash: batchInfo.blobHash,
                blobData: batchInfo.blobData,
                dataContainer: batchInfo.blobHash ? 'in_blob4844' : 'in_calldata',
                status: 'pending'
            }, { transaction: t });

            logger.info(`Created OP batch ${nextBatchIndex} for L2 workspace ${data.opConfigWorkspaceId} from L1 tx ${tx.hash}`);
        });

        return `Processed OP batch for tx ${tx.hash}`;
    } catch (error) {
        logger.error(`Error processing OP batch for tx ${tx.hash}: ${error.message}`, {
            location: 'jobs.processOpBatch',
            error
        });
        throw error;
    }
};
