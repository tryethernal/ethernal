const { getNodeEnv } = require('../lib/env');
const { Block, Workspace, Explorer, Transaction } = require('../models');
const { bulkEnqueue, enqueue } = require('../lib/queue');
const STALLED_BLOCK_REMOVAL_DELAY = getNodeEnv() == 'production' ? 5 * 60 * 1000 : 15 * 60 * 1000;

module.exports = async job => {
    const data = job.data;

    if (!data.blockId)
        return 'Missing parameter';

    const block = await Block.findByPk(data.blockId, {
        include: [
            {
                model: Transaction,
                as: 'transactions',
                attributes: ['id', 'hash']
            },
            {
                model: Workspace,
                as: 'workspace',
                attributes: ['id', 'public', 'tracing', 'integrityCheckStartBlockNumber'],
                include: {
                    model: Explorer,
                    as: 'explorer',
                    attributes: ['id', 'shouldSync']
                }
            }
        ]
    });

    if (!block)
        return 'Cannot find block';

    if (!block.workspace.public)
        return 'Not allowed on private workspaces';

    if (!block.workspace.explorer)
        return 'Inactive explorer';

    if (!block.workspace.explorer.shouldSync)
        return 'Sync is disabled';

    await enqueue('removeStalledBlock', `removeStalledBlock-${block.id}`, { blockId: block.id }, null, null, STALLED_BLOCK_REMOVAL_DELAY);

    if (block.workspace.tracing && block.workspace.tracing != 'hardhat') {
        const jobs = [];
        for (let i = 0; i < block.transactions.length; i++) {
            const transaction = block.transactions[i];
            jobs.push({
                name: `processTransactionTrace-${block.workspaceId}-${transaction.hash}`,
                data: { transactionId: transaction.id }
            });
        }
        await bulkEnqueue('processTransactionTrace', jobs);
    }

    if (block.workspace.integrityCheckStartBlockNumber === undefined || block.workspace.integrityCheckStartBlockNumber === null) {
        const integrityCheckStartBlockNumber = block.number < 1000 ? 0 : block.number;
        await block.workspace.update({ integrityCheckStartBlockNumber });
    }

    if (block.number == block.workspace.integrityCheckStartBlockNumber) {
        await enqueue('integrityCheck', `integrityCheck-${block.workspaceId}`, { workspaceId: block.workspaceId });
    }

    return true;
};
