const { ProviderConnector } = require('../lib/rpc');
const { Workspace, Explorer, StripeSubscription, Transaction, TransactionReceipt, RpcHealthCheck } = require('../models');
const { processRawRpcObject } = require('../lib/utils');
const { enqueue } = require('../lib/queue');
const RateLimiter = require('../lib/rateLimiter');
const logger = require('../lib/logger');

module.exports = async job => {
    const data = job.data;

    if (!data.transactionHash || !data.workspaceId)
        return 'Missing parameter'

    const include = [
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

    let limiter;
    if (data.rateLimited && workspace.rateLimitInterval && workspace.rateLimitMaxInInterval)
        limiter = new RateLimiter(workspace.id, workspace.rateLimitInterval, workspace.rateLimitMaxInInterval);

    const providerConnector = new ProviderConnector(workspace.rpcServer, limiter);

    try {
        let receipt;
        try {
            receipt = await providerConnector.fetchTransactionReceipt(transaction.hash);
        } catch(error) {
            if (error.message == 'Rate limited') {
                const priority = job.opts.priority || (data.source == 'cli-light' ? 1 : 10);
                await enqueue('receiptSync', `receiptSync-${workspace.id}-${transaction.hash}`, {
                    transactionId: transaction.id,
                    transactionHash: transaction.hash,
                    workspaceId: workspace.id,
                    source: data.source,
                    rateLimited: data.rateLimited
                }, priority, null, workspace.rateLimitInterval, data.rateLimited);
                return `Re-enqueuing: ${error.message}`
            }
        }

        if (!receipt)
            throw new Error('Failed to fetch receipt');

        const processedReceipt = processRawRpcObject(
            receipt,
            Object.keys(TransactionReceipt.rawAttributes).concat(['logs']),
        );

        return transaction.safeCreateReceipt(processedReceipt);
    } catch(error) {
        logger.error(error.message, { location: 'jobs.receiptSync', error, data });
        // await db.incrementFailedAttempts(transaction.workspace.id);
        throw error;
    } 
};
