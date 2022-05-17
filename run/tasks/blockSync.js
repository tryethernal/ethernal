const express = require('express');
const { ProviderConnector } = require('../lib/rpc');
const { sanitize, stringifyBns } = require('../lib/utils');
const { enqueueTask } = require('../lib/tasks');
const db = require('../lib/firebase');
const transactionsLib = require('../lib/transactions');

const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const data = req.body.data;

        if (!data.userId || !data.workspace || !data.blockNumber) {
            console.log(data);
            throw '[POST /tasks/blockSync] Missing parameter.';
        }

        const workspace = await db.getWorkspaceByName(data.userId, data.workspace);

        const providerConnector = new ProviderConnector(workspace.rpcServer);

        const block = await providerConnector.fetchBlockWithTransactions(data.blockNumber);

        if (!block)
            throw `Couldn't find block #${data.blockNumber}`;

        const syncedBlock = sanitize(stringifyBns({ ...block, transactions: block.transactions.map(tx => stringifyBns(tx)) }));
        const storedBlock = await db.storeBlock(data.userId, data.workspace, syncedBlock);

        // if (storedBlock && block.transactions.length === 0)
        //     return publish('bill-usage', { userId: data.userId, timestamp: block.timestamp });

        for (let i = 0; i < block.transactions.length; i++) {
            await enqueueTask('transactionSync', {
                userId: data.userId,
                workspace: data.workspace,
                transaction: stringifyBns(block.transactions[i]),
                timestamp: block.timestamp
            });
        }

        res.sendStatus(200);
    } catch(error) {
        console.log(error);
        res.sendStatus(400);
    }
});

module.exports = router;