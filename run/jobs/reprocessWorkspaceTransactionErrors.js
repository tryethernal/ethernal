const models = require('../models');
const { bulkEnqueue } = require('../lib/queue');

const Workspace = models.Workspace;

module.exports = async job => {
    const data = job.data;

    if (!data.workspaceId)
        throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(data.workspaceId);

    if (!workspace.public)
        return 'Not allowed on private workspaces';

    const transactions = await workspace.getTransactions();

    const batches = [];
    for (let i = 0; i < transactions.length; i++) {
        const transaction = transactions[i];
        batches.push({
            name: `processTransactionError-${data.workspaceId}-${transaction.hash}`,
            data: { transactionId: transaction.id }
        });
    }

    await bulkEnqueue('processTransactionError', batches);

    return true;
};
