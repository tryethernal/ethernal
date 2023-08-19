const { ProviderConnector } = require('../lib/rpc');
const db = require('../lib/firebase');
const logger = require('../lib/logger');

module.exports = async job => {
    const data = job.data;

    if (!data.rpcServer || !data.transactionHash || !data.transactionId)
        return 'Missing parameter'

    const providerConnector = new ProviderConnector(data.rpcServer);

    try {
        const receipt = await providerConnector.fetchTransactionReceipt(data.transactionHash);
        if (!receipt)
            throw new Error('Failed to fetch receipt');
    
        return db.storeTransactionReceipt(data.transactionId, receipt);
    } catch(error) {
        logger.error(error.message, { location: 'jobs.receiptSync', error, data });
        return 'Failed to sync receipt';
    }
};