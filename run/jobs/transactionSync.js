const express = require('express');
const { ProviderConnector } = require('../lib/rpc');
const { sanitize, stringifyBns } = require('../lib/utils');
const db = require('../lib/firebase');
const { enqueue } = require('../lib/queue');

module.exports = async job => {
    const data = job.data;

    if (!data.userId || !data.workspace || !data.transaction)
        throw new Error('Missing parameter.');

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

    // Should only happen if tx already exists
    if (!storedTx) return;

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
