const models = require('../models');
const { bulkEnqueue } = require('../lib/queue');
const MAX_BATCH_SIZE = 2000;

const Workspace = models.Workspace;

module.exports = async job => {
    const data = job.data;

    if (!data.workspaceId)
        throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(data.workspaceId);
    const transactions = await workspace.getTransactions();

    const batchedTransactions = [];
    for (let i = 0; i < transactions.length; i += MAX_BATCH_SIZE)
        batchedTransactions.push(transactions.slice(i, i + MAX_BATCH_SIZE));

    for (let i = 0; i < batchedTransactions.length; i++) {
        const batches = [];
        const batch = batchedTransactions[i];
        for (let j = 0; j < batch.length; j++) {
            const transaction = batch[j];
            batches.push({
                name: `transactionProcessing-${data.workspaceId}-${transaction.hash}`,
                data: { transactionId: transaction.id }
            });
        }

        await bulkEnqueue('transactionProcessing', batches);
    }

    return true;
};
