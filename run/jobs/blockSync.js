const { ProviderConnector } = require('../lib/rpc');
const { sanitize, stringifyBns } = require('../lib/utils');
const db = require('../lib/firebase');
const writeLog = require('../lib/writeLog');
const transactionsLib = require('../lib/transactions');
const { enqueue } = require('../lib/queue');

module.exports = async job => {
    const data = job.data;

    if (!data.userId || !data.workspace || data.blockNumber === undefined || data.blockNumber === null) {
        console.log(data);
        throw new Error('[jobs.blockSync] Missing parameter.');
    }

    const workspace = await db.getWorkspaceByName(data.userId, data.workspace);

    const providerConnector = new ProviderConnector(workspace.rpcServer);

    const block = await providerConnector.fetchBlockWithTransactions(data.blockNumber);

    if (!block)
        throw new Error("Couldn't fetch block from provider");

    const syncedBlock = sanitize(stringifyBns({ ...block, transactions: block.transactions.map(tx => stringifyBns(tx)) }));
    const storedBlock = await db.storeBlock(data.userId, data.workspace, syncedBlock);

    for (let i = 0; i < block.transactions.length; i++) {
        await enqueue('transactionSync', `transactionSync-${block.transactions[i].hash}`, { userId: data.userId, workspace: data.workspace, transaction: stringifyBns(block.transactions[i]), timestamp: block.timestamp });
    }

    return;
};
