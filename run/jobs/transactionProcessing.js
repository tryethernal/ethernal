const { processTransactions } = require('../lib/transactions');

module.exports = async job => {
    const data = job.data;

    if (!data.transactionId)
        throw new Error('Missing parameter.');

    return await processTransactions([data.transactionId]);
};
