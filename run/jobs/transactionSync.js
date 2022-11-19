const express = require('express');
const { ProviderConnector } = require('../lib/rpc');
const { sanitize, stringifyBns } = require('../lib/utils');
const db = require('../lib/firebase');
const { enqueueTask } = require('../lib/tasks');
const { enqueue } = require('../lib/queue');
const taskAuthMiddleware = require('../middlewares/taskAuth');

module.exports = async job => {
    const data = job.data;
    if (!data.userId || !data.workspace || !data.transaction) {
        console.log(data);
        throw new Error('[workers.transactionSync] Missing parameter.');
    }

    const workspace = await db.getWorkspaceByName(data.userId, data.workspace);
    const providerConnector = new ProviderConnector(workspace.rpcServer);

    const receipt = await providerConnector.fetchTransactionReceipt(data.transaction.hash);
    const promises = [];

    const sTransactionReceipt = receipt ? sanitize(stringifyBns(receipt)) : null;

    const txSynced = sanitize({
        ...data.transaction,
        receipt: sTransactionReceipt,
        timestamp: data.timestamp,
    });

    const storedTx = await db.storeTransaction(data.userId, data.workspace, txSynced);

    if (!txSynced.to && sTransactionReceipt) {
        const canSync = await db.canUserSyncContract(data.userId, data.workspace, sTransactionReceipt.contractAddress);
        if (canSync)
            await db.storeContractData(data.userId, data.workspace, sTransactionReceipt.contractAddress, {
                address: sTransactionReceipt.contractAddress,
                timestamp: data.timestamp
            });
    }

    return await enqueue(`transactionProcessing`, `transactionProcessing-${storedTx.id}`, {
        userId: data.userId,
        workspace: data.workspace,
        transaction: txSynced
    });
};
