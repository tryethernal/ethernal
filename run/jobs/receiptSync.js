const { ProviderConnector } = require('../lib/rpc');
const { Workspace, Explorer, StripeSubscription, Transaction, TransactionReceipt, RpcHealthCheck } = require('../models');
const db = require('../lib/firebase');
const logger = require('../lib/logger');

module.exports = async job => {
    const data = job.data;

    if (!data.transactionId)
        return 'Missing parameter'

    const transaction = await Transaction.findByPk(data.transactionId, {
        include: [
            {
                model: Workspace,
                as: 'workspace',
                attributes: ['id', 'rpcServer'],
                include: [
                    {
                        model: Explorer,
                        as: 'explorer',
                        include: {
                            model: StripeSubscription,
                            as: 'stripeSubscription',
                        }
                    },
                    {
                        model: RpcHealthCheck,
                        as: 'rpcHealthCheck'
                    }
                ]
            },
            {
                model: TransactionReceipt,
                as: 'receipt'
            }
        ]
    });

    if (!transaction)
        return 'Missing transaction';

    if (transaction.receipt)
        return 'Receipt has already been synced';

    if (!transaction.workspace)
        return 'Missing workspace';

    if (!transaction.workspace.explorer)
        return 'Inactive explorer';

    // if (!transaction.workspace.explorer.shouldSync)
    //     return 'Sync is disabled';

    if (transaction.workspace.rpcHealthCheck && !transaction.workspace.rpcHealthCheck.isReachable)
        return 'RPC is unreachable';

    if (!transaction.workspace.explorer.stripeSubscription)
        return 'No active subscription';

    const providerConnector = new ProviderConnector(transaction.workspace.rpcServer);

    try {
        const receipt = await providerConnector.fetchTransactionReceipt(transaction.hash);

        if (!receipt)
            throw new Error('Failed to fetch receipt');

        return db.storeTransactionReceipt(data.transactionId, receipt);
    } catch(error) {
        logger.error(error.message, { location: 'jobs.receiptSync', error, data });
        await db.incrementFailedAttempts(transaction.workspace.id);
        throw error;
    } 
};
