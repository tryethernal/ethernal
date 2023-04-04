const { ProviderConnector } = require('../lib/rpc');
const { sanitize, stringifyBns } = require('../lib/utils');
const db = require('../lib/firebase');
const transactionsLib = require('../lib/transactions');
const { enqueue } = require('../lib/queue');

module.exports = async job => {
    const data = job.data;

    if (!data.userId || !data.workspace || data.blockNumber === undefined || data.blockNumber === null)
        throw new Error('Missing parameter.');

    const workspace = await db.getWorkspaceByName(data.userId, data.workspace);

    const providerConnector = new ProviderConnector(workspace.rpcServer);

    const block = await providerConnector.fetchBlockWithTransactions(data.blockNumber);

    if (!block)
        throw new Error("Couldn't fetch block from provider");

    const syncPartialBlock = await db.syncPartialBlock(workspace.id, block);

    const formattedBlock = {
        block,
        transactions: [],
    }
    for (let i = 0; i < block.transactions.length; i++) {
        const transaction = block.transactions[i];
        const receipt = await providerConnector.fetchTransactionReceipt(transaction.hash);

        if (!receipt)
            throw new Error("Failed fetching receipt");

        formattedBlock.transactions.push({
            ...transaction,
            receipt
        });

        if (formattedBlock.transactions.length != block.transactions.length)
            throw new Error('Missing transactions');
    }

    await db.syncFullBlock(workspace.id, formattedBlock);

    return true;
};
