const { ProviderConnector } = require('../lib/rpc');
const db = require('../lib/firebase');
const logger = require('../lib/logger');

module.exports = async job => {
    const data = job.data;

    if (!data.userId || !data.workspace || data.blockNumber === undefined || data.blockNumber === null)
        return 'Missing parameter';

    const workspace = await db.getWorkspaceByName(data.userId, data.workspace);

    if (!workspace)
        return 'Invalid workspace.';

    if (!workspace.explorer)
        return 'No active explorer for this workspace';

    if (!workspace.explorer.shouldSync)
        return 'Sync is disabled';

    if (workspace.explorer.rpcHealthCheck && workspace.explorer.rpcHealthCheck.tooManyFailedAttempts())
        return 'Too many failed RPC requests';

    if (!workspace.explorer.stripeSubscription)
        return 'No active subscription';

    if (workspace.browserSyncEnabled)
        await db.updateBrowserSync(workspace.id, false);

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

        if (workspace.rpcHealthCheck && workspace.rpcHealthCheck.failedAttempts > 0)
            await db.resetFailedAttempts(workspace.id);

        return 'Block synced';
    } catch(error) {
        logger.error(error.message, { location: 'jobs.blockSync', error, data });
        await db.incrementFailedAttempts(workspace.id);
        throw error;
    }
};
