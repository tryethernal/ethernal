const { ProviderConnector } = require('../lib/rpc');
const { Workspace, Explorer, StripeSubscription, Transaction, TransactionReceipt, RpcHealthCheck, OrbitChainConfig } = require('../models');
const { processRawRpcObject } = require('../lib/utils');
const { enqueue } = require('../lib/queue');
const RateLimiter = require('../lib/rateLimiter');
const logger = require('../lib/logger');

module.exports = async job => {
    const data = job.data;

    if (!data.transactionHash || !data.workspaceId)
        return 'Missing parameter'

    // Use cached workspace data if available (passed from blockSync for faster processing)
    const hasCachedWorkspace = data.cachedWorkspace && data.cachedWorkspace.rpcServer;

    // When we have cached workspace data, use a lighter query that skips workspace includes
    const include = hasCachedWorkspace ? [
        {
            model: TransactionReceipt,
            as: 'receipt',
            attributes: ['id']
        }
    ] : [
        {
            model: Workspace,
            as: 'workspace',
            attributes: ['id', 'rpcServer', 'rateLimitInterval', 'rateLimitMaxInInterval', 'public', 'rpcHealthCheckEnabled'],
            include: [
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
                    attributes: ['isReachable']
                },
                {
                    model: OrbitChainConfig,
                    as: 'orbitChildConfigs'
                },
                {
                    model: OrbitChainConfig,
                    as: 'orbitConfig'
                }
            ]
        },
        {
            model: TransactionReceipt,
            as: 'receipt',
            attributes: ['id']
        }
    ];

    const transaction = data.transactionId ?
        await Transaction.findByPk(data.transactionId, { include }) :
        await Transaction.findOne({
            where: {
                hash: data.transactionHash,
                workspaceId: data.workspaceId
            },
            include
        });

    if (!transaction)
        return 'Missing transaction';

    if (transaction.receipt)
        return 'Receipt has already been synced';

    // Use cached workspace data or fetch from transaction
    let rpcServer, rateLimitInterval, rateLimitMaxInInterval, isPublic;

    if (hasCachedWorkspace) {
        // Use cached data from blockSync - skip validation since blockSync already validated
        rpcServer = data.cachedWorkspace.rpcServer;
        rateLimitInterval = data.cachedWorkspace.rateLimitInterval;
        rateLimitMaxInInterval = data.cachedWorkspace.rateLimitMaxInInterval;
        isPublic = data.cachedWorkspace.public;

        if (!isPublic)
            return 'Cannot sync on private workspace';
    } else {
        // Fallback: full validation when no cached data
        if (!transaction.workspace)
            return 'Missing workspace';

        const workspace = transaction.workspace;

        if (!workspace.public)
            return 'Cannot sync on private workspace';

        if (!workspace.explorer)
            return 'Inactive explorer';

        if (!workspace.explorer.shouldSync)
            return 'Disabled sync';

        if (workspace.rpcHealthCheck && workspace.rpcHealthCheckEnabled && !workspace.rpcHealthCheck.isReachable)
            return 'RPC is unreachable';

        if (!workspace.explorer.stripeSubscription)
            return 'No active subscription';

        rpcServer = workspace.rpcServer;
        rateLimitInterval = workspace.rateLimitInterval;
        rateLimitMaxInInterval = workspace.rateLimitMaxInInterval;
    }

    let limiter;
    if (data.rateLimited && rateLimitInterval && rateLimitMaxInInterval)
        limiter = new RateLimiter(data.workspaceId, rateLimitInterval, rateLimitMaxInInterval);

    const providerConnector = new ProviderConnector(rpcServer, limiter);

    try {
        let receipt;
        try {
            receipt = await providerConnector.fetchTransactionReceipt(transaction.hash);
        } catch(error) {
            const priority = job.opts.priority || (data.source == 'cli-light' ? 1 : 10);
            // Build job data, preserving cached workspace if available
            const requeueData = {
                transactionId: transaction.id,
                transactionHash: transaction.hash,
                workspaceId: data.workspaceId,
                source: data.source,
                rateLimited: !!data.rateLimited
            };
            if (data.cachedWorkspace) {
                requeueData.cachedWorkspace = data.cachedWorkspace;
            }

            if (error.message == 'Rate limited') {
                return enqueue('receiptSync', `receiptSync-${data.workspaceId}-${transaction.hash}-${Date.now()}`,
                    requeueData, priority, null, rateLimitInterval, !!data.rateLimited);
            }
            else if (error.message.startsWith('Timed out after')) {
                return enqueue('receiptSync', `receiptSync-${data.workspaceId}-${transaction.hash}-${Date.now()}`,
                    requeueData, priority, null, rateLimitInterval || 5000, !!data.rateLimited);
            }
            else
                throw error;
        }

        if (!receipt)
            throw new Error('Failed to fetch receipt');

        let processedReceipt = processRawRpcObject(
            receipt,
            Object.keys(TransactionReceipt.rawAttributes).concat(['logs']),
        );

        // For safeCreateReceipt, we need to pass workspace context for orbit processing
        // When using cached data, construct a minimal workspace-like object
        if (hasCachedWorkspace) {
            processedReceipt.workspace = { id: data.workspaceId };
        } else {
            processedReceipt.workspace = transaction.workspace;
        }

        return transaction.safeCreateReceipt(processedReceipt);
    } catch(error) {
        logger.error(error.message, { location: 'jobs.receiptSync', error, data });
        throw error;
    }
};
