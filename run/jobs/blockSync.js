const { ProviderConnector } = require('../lib/rpc');
const { Workspace, Explorer, StripeSubscription, StripePlan, RpcHealthCheck, Block } = require('../models');
const db = require('../lib/firebase');
const logger = require('../lib/logger');
const { processRawRpcObject } = require('../lib/utils');
const { enqueue, bulkEnqueue } = require('../lib/queue');
const RateLimiter = require('../lib/rateLimiter');

module.exports = async job => {
    const data = job.data;

    if (!data.userId || !data.workspace || data.blockNumber === undefined || data.blockNumber === null)
        return 'Missing parameter';

    const workspace = await Workspace.findOne({
        where: {
            name: data.workspace,
            '$user.firebaseUserId$': data.userId
        },
        include: [
            'user',
            {
                model: Explorer,
                as: 'explorer',
                include: {
                    model: StripeSubscription,
                    as: 'stripeSubscription',
                    include: {
                        model: StripePlan,
                        as: 'stripePlan'
                    }
                }
            },
            {
                model: RpcHealthCheck,
                as: 'rpcHealthCheck'
            }
        ]
    });

    if (!workspace)
        return 'Invalid workspace.';

    if (!workspace.explorer)
        return 'No active explorer for this workspace';

    if (!workspace.explorer.shouldSync)
        return 'Sync is disabled';

    if (workspace.rpcHealthCheckEnabled && workspace.rpcHealthCheck && !workspace.rpcHealthCheck.isReachable)
        return 'RPC is not reachable';

    if (!workspace.explorer.stripeSubscription)
        return 'No active subscription';

    if (workspace.browserSyncEnabled)
        await db.updateBrowserSync(workspace.id, false);

    const existingBlock = await db.getWorkspaceBlock(workspace.id, data.blockNumber);
    if (existingBlock)
        return 'Block already exists in this workspace';

    if (data.source == 'recovery' && workspace.integrityCheck && workspace.integrityCheck.isHealthy)
        await db.updateWorkspaceIntegrityCheck(workspace.id, { status: 'recovering' });
    else if (data.source != 'recovery' && workspace.integrityCheck && workspace.integrityCheck.isRecovering)
        await db.updateWorkspaceIntegrityCheck(workspace.id, { status: 'healthy' });

    let limiter;
    if (data.rateLimited && workspace.rateLimitInterval && workspace.rateLimitMaxInInterval)
        limiter = new RateLimiter(workspace.id, workspace.rateLimitInterval, workspace.rateLimitMaxInInterval);
    const providerConnector = new ProviderConnector(workspace.rpcServer, limiter);
    let block;

    try {
        try {
            block = await providerConnector.fetchRawBlockWithTransactions(data.blockNumber);
        } catch(error) {
            if (error.message == 'Rate limited') {
                const priority = job.opts.priority || (data.source == 'cli-light' ? 1 : 10);
                await enqueue('blockSync', `blockSync-${workspace.id}-${data.blockNumber}`, {
                    userId: workspace.user.firebaseUserId,
                    workspace: workspace.name,
                    blockNumber: data.blockNumber,
                    source: data.source,
                    rateLimited: data.rateLimited
                }, priority, null, workspace.rateLimitInterval);
                return `Re-enqueuing: ${error.message}`
            }
            else
                throw error;
        }

        if (!block)
            return "Couldn't fetch block from provider";

        if (await workspace.explorer.hasReachedTransactionQuota())
            return 'Transaction quota reached';
    
        const processedBlock = processRawRpcObject(
            block,
            Object.keys(Block.rawAttributes).concat(['transactions'])
        );

        const syncedBlock = await db.syncPartialBlock(workspace.id, processedBlock);
        if (!syncedBlock)
            throw new Error("Couldn't store block");

        const transactions = syncedBlock.transactions;
        const jobs = [];
        for (let i = 0; i < transactions.length; i++) {
            const transaction = transactions[i];
            jobs.push({
                name: `receiptSync-${workspace.id}-${transaction.hash}`,
                data: {
                    transactionHash: transaction.hash,
                    workspaceId: workspace.id,
                    source: data.source,
                    rateLimited: data.rateLimited
                }
            });
        }
        await bulkEnqueue('receiptSync', jobs, job.opts.priority);

        return 'Block synced';
    } catch(error) {
        logger.error(error.message, { location: 'jobs.blockSync', error, data });
        // await db.incrementFailedAttempts(workspace.id);
        throw error;
    }
};
