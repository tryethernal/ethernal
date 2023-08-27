const { ProviderConnector } = require('../lib/rpc');
const { Workspace, Explorer, StripeSubscription, Transaction, TransactionReceipt } = require('../models');
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
                attributes: ['rpcServer'],
                include: {
                    model: Explorer,
                    as: 'explorer',
                    include: {
                        model: StripeSubscription,
                        as: 'stripeSubscription',
                    }
                }
            },
            {
                model: TransactionReceipt,
                as: 'receipt'
            }
        ]
    });

    if (!transaction)
        throw new Error('Missing transaction');

    if (transaction.receipt)
        throw new Error('Receipt has already been synced');

    if (!transaction.workspace)
        throw new Error('Missing workspace');

    if (!transaction.workspace.explorer)
        throw new Error('Inactive explorer');

    if (!transaction.workspace.explorer.stripeSubscription)
        throw new Error('No active subscription');

    const providerConnector = new ProviderConnector(transaction.workspace.rpcServer);

    try {
        const receipt = await providerConnector.fetchTransactionReceipt(transaction.hash);

        if (!receipt)
            throw new Error('Failed to fetch receipt');
    
        return db.storeTransactionReceipt(data.transactionId, receipt);
    } catch(error) {
        logger.error(error.message, { location: 'jobs.receiptSync', error, data });
        throw error;
    } 
};