/**
 * @fileoverview Stalled block removal job.
 * Reverts blocks stuck in syncing state or triggers billing quota increase.
 * @module jobs/removeStalledBlock
 */

const { Block } = require('../models');
const { enqueue } = require('../lib/queue');

module.exports = async (job) => {
    const data = job.data;

    if (!data.blockId)
        return 'Missing parameter';

    // Use workspaceId in query for better performance on hypertables
    // Fallback to findByPk for backward compatibility with existing job data
    const block = data.workspaceId
        ? await Block.findOne({ where: { id: data.blockId, workspaceId: data.workspaceId } })
        : await Block.findByPk(data.blockId);
    if (!block)
        return 'Could not find block';

    // Let revertIfPartial() handle all the checking logic to avoid redundant queries
    const wasReverted = await block.revertIfPartial();

    if (wasReverted) {
        return `Removed stalled block ${block.id} - Workspace ${block.workspaceId} - #${block.number}`;
    }
    else {
        await enqueue('increaseStripeBillingQuota', `increaseStripeBillingQuota-${data.blockId}-${block.workspaceId}`, { blockId: data.blockId });
    }

    return true;
};
