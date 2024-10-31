const { ProviderConnector } = require('../lib/rpc');
const { Workspace, Explorer, StripeSubscription, RpcHealthCheck, IntegrityCheck, Block } = require('../models');
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
        attributes: ['id', 'rpcHealthCheckEnabled', 'rateLimitInterval', 'rateLimitMaxInInterval', 'name', 'rpcServer', 'browserSyncEnabled'],
        where: {
            name: data.workspace,
            '$user.firebaseUserId$': data.userId
        },
        include: [
            'user',
            {
                model: Explorer,
                as: 'explorer',
                attributes: ['id', 'shouldSync'],
                include: {
                    model: StripeSubscription,
                    as: 'stripeSubscription',
                    attributes: ['id']
                }
            },
            {
                model: RpcHealthCheck,
                as: 'rpcHealthCheck',
                attributes: ['id', 'isReachable']
            },
            {
                model: IntegrityCheck,
                as: 'integrityCheck',
                attributes: ['id', 'isHealthy', 'isRecovering']
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
            const priority = job.opts.priority || (data.source == 'cli-light' ? 1 : 10);
            if (error.message == 'Rate limited') {
                return enqueue('blockSync', `blockSync-${workspace.id}-${data.blockNumber}-${Date.now()}`, {
                    userId: workspace.user.firebaseUserId,
                    workspace: workspace.name,
                    blockNumber: data.blockNumber,
                    source: data.source,
                    rateLimited: !!data.rateLimited
                }, priority, null, workspace.rateLimitInterval, !!data.rateLimited);
            }
            else if (error.message.startsWith('Timed out after')) {
                return enqueue('blockSync', `blockSync-${workspace.id}-${data.blockNumber}-${Date.now()}`, {
                    userId: workspace.user.firebaseUserId,
                    workspace: workspace.name,
                    blockNumber: data.blockNumber,
                    source: data.source,
                    rateLimited: !!data.rateLimited
                }, priority, null, workspace.rateLimitInterval || 5000, !!data.rateLimited);
            }
            else
                throw error;
        }

        if (!block)
            return "Couldn't fetch block from provider";

        const processedBlock = processRawRpcObject(
            block,
            Object.keys(Block.rawAttributes).concat(['transactions'])
        );

        const syncedBlock = await workspace.safeCreatePartialBlock(processedBlock);
        if (!syncedBlock)
            return "Couldn't store block";

        const transactions = syncedBlock.transactions;
        const jobs = [];
        for (let i = 0; i < transactions.length; i++) {
            const transaction = transactions[i];
            jobs.push({
                name: `receiptSync-${workspace.id}-${transaction.hash}`,
                data: {
                    transactionId: transaction.id,
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
        console.log(error);
        logger.error(error.message, { location: 'jobs.blockSync', error, data });
        throw error;
    }
};
