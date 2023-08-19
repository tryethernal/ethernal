const { ProviderConnector } = require('../lib/rpc');
const db = require('../lib/firebase');
const logger = require('../lib/logger');
const { isSubscriptionCheckEnabled } = require('../lib/flags');

module.exports = async job => {
    const data = job.data;

    if (!data.userId || !data.workspace || data.blockNumber === undefined || data.blockNumber === null)
        return 'Missing parameter';

    const workspace = await db.getWorkspaceByName(data.userId, data.workspace);

    if (!workspace)
        return 'Invalid workspace.';

    if (!workspace.explorer)
        return 'No active explorer for this workspace';

    const existingBlock = await db.getWorkspaceBlock(workspace.id, data.blockNumber);
    if (existingBlock)
        return 'Block already exists in this workspace.';

    if (data.source == 'recovery' && workspace.integrityCheck && workspace.integrityCheck.isHealthy)
        await db.updateWorkspaceIntegrityCheck(workspace.id, { status: 'recovering' });
    else if (data.source != 'recovery' && workspace.integrityCheck && workspace.integrityCheck.isRecovering)
        await db.updateWorkspaceIntegrityCheck(workspace.id, { status: 'healthy' });

    const providerConnector = new ProviderConnector(workspace.rpcServer);

    const block = await providerConnector.fetchBlockWithTransactions(data.blockNumber);

    if (!block)
        throw new Error("Couldn't fetch block from provider");

    await db.syncPartialBlock(workspace.id, block);

    for (let i = 0; i < block.transactions.length; i++) {
        const transaction = block.transactions[i];
        const receipt = await providerConnector.fetchTransactionReceipt(transaction.hash);
    }

    return 'Block synced';
};
