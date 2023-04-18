const { ProviderConnector } = require('../lib/rpc');
const { sanitize, stringifyBns } = require('../lib/utils');
const db = require('../lib/firebase');
const transactionsLib = require('../lib/transactions');
const logger = require('../lib/logger');
const { enqueue } = require('../lib/queue');

module.exports = async job => {
    const data = job.data;

    if (!data.userId || !data.workspace || data.blockNumber === undefined || data.blockNumber === null)
        throw new Error('Missing parameter.');

    const workspace = await db.getWorkspaceByName(data.userId, data.workspace);

    if (data.source == 'recovery' && workspace.integrityCheck && workspace.integrityCheck.isHealthy)
        await db.updateWorkspaceIntegrityCheck(workspace.id, { status: 'recovering' });
    else if (data.source != 'recovery' && workspace.integrityCheck && workspace.integrityCheck.isRecovering)
        await db.updateWorkspaceIntegrityCheck(workspace.id, { status: 'healthy' });

    const providerConnector = new ProviderConnector(workspace.rpcServer);

    const block = await providerConnector.fetchBlockWithTransactions(data.blockNumber);

    if (!block)
        throw new Error("Couldn't fetch block from provider");

    const partialBlock = await db.syncPartialBlock(workspace.id, block);

    const formattedBlock = {
        block,
        transactions: [],
    };

    try {
        for (let i = 0; i < block.transactions.length; i++) {
            const transaction = block.transactions[i];
            const receipt = await providerConnector.fetchTransactionReceipt(transaction.hash);

            if (!receipt)
                throw new Error('Failed to fetch receipt');

            formattedBlock.transactions.push({
                ...transaction,
                receipt
            });
        }
    } catch(error) {
        await db.revertPartialBlock(partialBlock.id);
        logger.error(error.message, { location: 'jobs.blockSync', error: error, data: data });
        throw error;
    }

    await db.syncFullBlock(workspace.id, formattedBlock);

    return true;
};
