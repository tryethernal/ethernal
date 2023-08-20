const { ProviderConnector } = require('../lib/rpc');
const db = require('../lib/firebase');
const logger = require('../lib/logger');
const { bulkEnqueue } = require('../lib/queue');

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

    try {
        const block = await providerConnector.fetchBlockWithTransactions(data.blockNumber);
        if (!block)
            throw new Error("Couldn't fetch block from provider");

        const syncedBlock = await db.syncPartialBlock(workspace.id, block);

        if (!syncedBlock)
            throw new Error("Couldn't store block");

        const jobs = [];
        for (let i = 0; i < syncedBlock.transactions.length; i++) {
            const transaction = syncedBlock.transactions[i];
            jobs.push({
                name: `receiptSync-${transaction.hash}`,
                data: { transactionId: transaction.id }
            });
        }

        await bulkEnqueue('receiptSync', jobs);

        return 'Block synced';
    } catch(error) {
        logger.error(error.message, { location: 'jobs.blockSync', error, data });
        return error.message;
    }
};
