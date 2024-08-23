const { Block } = require('../models');
const { enqueue } = require('../lib/queue');

module.exports = async (job) => {
    const data = job.data;

    if (!data.blockId)
        return 'Missing parameter';

    const block = await Block.findByPk(data.blockId, {
        include: ['transactions']
    });
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
