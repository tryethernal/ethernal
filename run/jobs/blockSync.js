const { ProviderConnector } = require('../lib/rpc');
const db = require('../lib/firebase');
const logger = require('../lib/logger');
const { withTimeout } = require('../lib/utils');

const NETWORK_TIMEOUT = 10 * 1000;

module.exports = async job => {
    const data = job.data;

    if (!data.userId || !data.workspace || data.blockNumber === undefined || data.blockNumber === null)
        return 'Missing parameter';

    const workspace = await db.getWorkspaceByName(data.userId, data.workspace);

    if (data.source == 'recovery' && workspace.integrityCheck && workspace.integrityCheck.isHealthy)
        await db.updateWorkspaceIntegrityCheck(workspace.id, { status: 'recovering' });
    else if (data.source != 'recovery' && workspace.integrityCheck && workspace.integrityCheck.isRecovering)
        await db.updateWorkspaceIntegrityCheck(workspace.id, { status: 'healthy' });

    const providerConnector = new ProviderConnector(workspace.rpcServer);

    const block = await withTimeout(providerConnector.fetchBlockWithTransactions(data.blockNumber), NETWORK_TIMEOUT);

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
            const receipt = await withTimeout(providerConnector.fetchTransactionReceipt(transaction.hash), NETWORK_TIMEOUT);

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
