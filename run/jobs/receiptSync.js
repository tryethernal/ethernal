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
                required: true,
                include: {
                    model: Explorer,
                    as: 'explorer',
                    required: true,
                    include: {
                        model: StripeSubscription,
                        as: 'stripeSubscription',
                        required: true
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
        return 'Missing transaction';

    if (transaction.receipt)
        return 'Receipt has already been synced';

    if (!transaction.workspace.explorer || !transaction.workspace.explorer.stripeSubscription)
        return 'Inactive explorer';

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