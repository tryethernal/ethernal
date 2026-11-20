/**
 * @fileoverview Stalled block removal job.
 * Reverts blocks stuck in syncing state or triggers billing quota increase.
 * Blocks whose transactions are still syncing are given time to finish (receipts may just be queued):
 * the check is re-enqueued until the block is older than STALLED_BLOCK_MAX_AGE.
 * @module jobs/removeStalledBlock
 */

const { Block } = require('../models');
const { STALLED_BLOCK_REMOVAL_DELAY, STALLED_BLOCK_MAX_AGE } = require('../models/block');
const { enqueue } = require('../lib/queue');
const { isSelfHosted } = require('../lib/flags');

/**
 * @param {Object} job - BullMQ job
 * @param {Object} job.data
 * @param {number} job.data.blockId - Block to check
 * @param {number} [job.data.workspaceId] - Workspace of the block (faster lookup on hypertables)
 * @param {number} [job.data.attempt=0] - Number of times this check has already been deferred
 * @returns {Promise<string|boolean>}
 * @throws {Error} If blockId is missing
 */
module.exports = async (job) => {
    const data = job.data;

    if (!data.blockId)
        throw new Error('Missing parameter');

    // Use workspaceId in query for better performance on hypertables
    // Fallback to findByPk for backward compatibility with existing job data
    // Only select fields needed by checkPartial() method for performance
    const attributes = ['id', 'workspaceId', 'number', 'transactionsCount', 'createdAt'];
    const block = data.workspaceId
        ? await Block.findOne({
            where: { id: data.blockId, workspaceId: data.workspaceId },
            attributes
        })
        : await Block.findByPk(data.blockId, { attributes });
    if (!block)
        return 'Could not find block';

    // Let checkPartial() handle all the checking logic to avoid redundant queries
    const status = await block.checkPartial({ syncingGraceMs: STALLED_BLOCK_MAX_AGE });

    if (status == 'reverted') {
        return `Removed stalled block ${block.id} - Workspace ${block.workspaceId} - #${block.number}`;
    }
    else if (status == 'deferred') {
        const attempt = (data.attempt || 0) + 1;
        await enqueue(
            'removeStalledBlock',
            `removeStalledBlock-${data.blockId}-${attempt}`,
            { blockId: data.blockId, workspaceId: block.workspaceId, attempt },
            null,
            null,
            STALLED_BLOCK_REMOVAL_DELAY
        );
        return `Deferred stalled block check ${block.id} - Workspace ${block.workspaceId} - attempt ${attempt}`;
    }
    else if (!isSelfHosted()) {
        await enqueue('increaseStripeBillingQuota', `increaseStripeBillingQuota-${data.blockId}-${block.workspaceId}`, { blockId: data.blockId, workspaceId: block.workspaceId });
    }

    return true;
};
