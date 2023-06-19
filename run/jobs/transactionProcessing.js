const { processTransactions } = require('../lib/transactions');

module.exports = job => {
    const data = job.data;

    if (!data.transactionId)
        throw new Error('Missing parameter.');

    return processTransactions([data.transactionId]);
};
