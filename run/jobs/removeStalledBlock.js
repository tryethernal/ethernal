/**
 * @fileoverview Stalled block removal job.
 * Reverts blocks stuck in syncing state or triggers billing quota increase.
 * @module jobs/removeStalledBlock
 */

const { Block } = require('../models');
const { enqueue } = require('../lib/queue');
const { SequelizeDatabaseError } = require('sequelize');

module.exports = async (job) => {
    const data = job.data;

    if (!data.blockId)
        return 'Missing parameter';

    let block;
    try {
        block = await Block.findByPk(data.blockId, {
            include: ['transactions']
        });
    } catch (error) {
        if (error instanceof SequelizeDatabaseError) {
            // Throw retryable error for connection issues to allow BullMQ retry
            throw new Error(`Database connection error for block ${data.blockId}: ${error.message}`);
        }
        throw error;
    }

    if (!block)
        return 'Could not find block';

    const hasTransactionSyncing = block.transactions.length > 0 && block.transactions.filter(t => t.isSyncing).length > 0;
    if (hasTransactionSyncing) {
        await block.revertIfPartial();
        return `Removed stalled block ${block.id} - Workspace ${block.workspaceId} - #${block.number}`;
    }
    else
        await enqueue('increaseStripeBillingQuota', `increaseStripeBillingQuota-${data.blockId}-${block.workspaceId}`, { blockId: data.blockId });

    return true;
};
