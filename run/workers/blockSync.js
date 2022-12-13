const { ProviderConnector } = require('../lib/rpc');
const { sanitize, stringifyBns } = require('../lib/utils');
const { enqueueTask } = require('../lib/tasks');
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
        throw new Error("Couldn't fetch block from provider")

    // throw new Error('this is an error');

    const syncedBlock = sanitize(stringifyBns({ ...block, transactions: block.transactions.map(tx => stringifyBns(tx)) }));
    const storedBlock = await db.storeBlock(data.userId, data.workspace, syncedBlock);

    for (let i = 0; i < block.transactions.length; i++) {
        await enqueue('transactionSync', `sync-tx-${block.transactions[i].hash}`, { userId: data.userId, workspace: data.workspace, transaction: stringifyBns(block.transactions[i]), timestamp: block.timestamp });
    }
};
