const express = require('express');
const { ProviderConnector } = require('../lib/rpc');
const { sanitize, stringifyBns } = require('../lib/utils');
const db = require('../lib/firebase');
const { enqueueTask } = require('../lib/tasks');
const taskAuthMiddleware = require('../middlewares/taskAuth');

const router = express.Router();

router.post('/', taskAuthMiddleware, async (req, res) => {
    try {
        const data = req.body.data;
        if (!data.userId || !data.workspace || !data.transaction) {
            console.log(data);
            throw '[transactionSyncTask] Missing parameter.';
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
        // if (storedTx)
        //     await publish('bill-usage', { userId: data.userId, timestamp: data.timestamp });

        if (!txSynced.to && sTransactionReceipt) {
            const canSync = await db.canUserSyncContract(data.userId, data.workspace, sTransactionReceipt.contractAddress);
            if (canSync)
                await db.storeContractData(data.userId, data.workspace, sTransactionReceipt.contractAddress, {
                    address: sTransactionReceipt.contractAddress,
                    timestamp: data.timestamp
                });
        }

        await enqueueTask('transactionProcessing', {
            userId: data.userId,
            workspace: data.workspace,
            transaction: txSynced,
            secret: process.env.AUTH_SECRET
        });
        
        res.sendStatus(200);
    } catch(error) {
        console.log(error);
        res.sendStatus(400);
    }
});

module.exports = router;
