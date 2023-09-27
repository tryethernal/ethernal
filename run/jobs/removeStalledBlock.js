const { Block, Transaction } = require('../models');

module.exports = async (job) => {
    const data = job.data;

    if (!data.blockId)
        throw new Error('Missing parameter');

    const block = await Block.findByPk(data.blockId, {
        include: ['transactions']
    });
    if (!block)
        return 'Could not find block';

    const hasTransactionSyncing = block.transactions.map(t => t.isSyncing).length > 0;
    if (hasTransactionSyncing) {
        await block.revertIfPartial();
        return `Removed stalled block ${block.id} - Workspace ${block.workspaceId} - #${block.number}`;
    }

    return true;
};
