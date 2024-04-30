const { ProviderConnector } = require('../lib/rpc');
const { Workspace, Explorer, StripeSubscription, StripePlan, RpcHealthCheck, Block } = require('../models');
const db = require('../lib/firebase');
const logger = require('../lib/logger');
const { processRawRpcObject } = require('../lib/utils');
const { RedisRateLimiter } = require("rolling-rate-limiter");
const Redis = require("ioredis");
const redis = new Redis({
    port: process.env.REDIS_PORT,
    host: process.env.REDIS_HOST
});

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

    const providerConnector = new ProviderConnector(workspace.rpcServer);
    let block;

    try {
        const limiter = new RedisRateLimiter({
            client: redis,
            namespace: 'rate-limiter',
            interval: 60000,
            maxInInterval: 5
        });
        const info = await limiter.wouldLimitWithInfo(workspace.id);
        console.log(info)
        await limiter.limit(workspace.id).then(async blocked => {
            if (blocked)
                console.log('Blocked ' + data.blockNumber);
            else
                block = await providerConnector.fetchRawBlockWithTransactions(data.blockNumber);
        });

        if (!block)
            throw new Error("Couldn't fetch block from provider");

        if (await workspace.explorer.hasReachedTransactionQuota())
            return 'Transaction quota reached';
    
        const processedBlock = processRawRpcObject(
            block,
            Object.keys(Block.rawAttributes).concat(['transactions'])
        );

        const syncedBlock = await db.syncPartialBlock(workspace.id, processedBlock);
        if (!syncedBlock)
            throw new Error("Couldn't store block");

        return 'Block synced';
    } catch(error) {
        logger.error(error.message, { location: 'jobs.blockSync', error, data });
        await db.incrementFailedAttempts(workspace.id);
        throw error;
    }
};
