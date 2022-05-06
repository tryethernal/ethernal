const express = require('express');
const app = express();
const cors = require('cors');
const { ProviderConnector } = require('./lib/rpc');
const { sanitize, stringifyBns } = require('./lib/utils');
const { enqueueTask } = require('./lib/tasks');
const db = require('./lib/firebase');
const transactionsLib = require('./lib/transactions');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const firebase = initializeApp();
app.use(express.json());
app.use(cors({ origin: 'http://app.antoine.local:8081' }));

const workspaceAuthMiddleware = async (req, res, next) => {
    try {
        let firebaseUser;
        const data = req.query;

        if (!data.firebaseUserId || !data.workspace)
            return res.status(401).send('[workspaceAuth] Missing parameters');

        if (data.firebaseAuthToken) {
            firebaseUser = await getAuth().verifyIdToken(data.firebaseAuthToken);
        }

        const workspace = await db.getWorkspaceByName(data.firebaseUserId, data.workspace);

        if (workspace.public || (firebaseUser && data.firebaseUserId == firebaseUser.user_id)) {
            res.locals.firebaseUserId = firebaseUser.user_id;
            res.locals.workspace = workspace;
            next();
        }
        else
            res.sendStatus(404);
    } catch(error) {
        console.log(error);
        res.status(401).send(error);
    }
};

app.get('/api/blocks/:number', workspaceAuthMiddleware, async (req, res) => {
    try {
        if (!req.params.number)
            throw '[/api/blocks/:number] Missing parameter';

        const block = await db.getWorkspaceBlock(res.locals.workspace.id, req.params.number, !!req.query.withTransactions);
        console.log(block)
        res.status(200).json(block);
    } catch(error) {
        console.log(error);
        res.status(400).send(error);
    }
});

app.get('/api/blocks', workspaceAuthMiddleware, async (req, res) => {
    try {
        const data = {
            ...req.query,
            ...res.locals
        };

        if (!data.page || !data.itemsPerPage)
            throw '[/api/blocks] Missing parameters';

        const blocks = await db.getWorkspaceBlocks(data.workspace.id, data.page, data.itemsPerPage, data.order || 'DESC');
        
        res.status(200).json(blocks);
    } catch(error) {
        console.log(error);
        res.status(400).send(error);
    }
});

app.post('/ss-block-sync', async (req, res) => {
    try {
        const data = req.body.data;

        if (!data.userId || !data.workspace || !data.blockNumber) {
            console.log(data);
            throw new functions.https.HttpsError('invalid-argument', '[blockSyncTask] Missing parameter.');
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
        
        const url = process.env.NODE_ENV == 'production' ?
            `https://tasks-pql6sv7epq-uc.a.run.app/tasks/transactionSync` :
            `http://localhost:8888/ss-transaction-sync`;

        for (let i = 0; i < block.transactions.length; i++) {
            await enqueueTask('transactionSyncTaskCloudRun', {
                userId: data.userId,
                workspace: data.workspace,
                transaction: stringifyBns(block.transactions[i]),
                timestamp: block.timestamp
            }, url);
        }

        res.sendStatus(200);
    } catch(error) {
        console.log(error);
        res.sendStatus(400);
    }
});

app.post('/ss-transaction-sync', async (req, res) => {
    try {
        const data = req.body.data;
        if (!data.userId || !data.workspace || !data.transaction) {
            console.log(data);
            throw new functions.https.HttpsError('invalid-argument', '[transactionSyncTask] Missing parameter.');
        }

        const workspace = await db.getWorkspaceByName(data.userId, data.workspace);
        const providerConnector = new ProviderConnector(workspace.rpcServer);

        const receipt = await providerConnector.fetchTransactionReceipt(data.transaction.hash);
        const promises = [];

        const sTransactionReceipt = receipt ? sanitize(stringifyBns(receipt)) : null;

        const txSynced = sanitize({
            ...data.transaction,
            receipt: sTransactionReceipt,
            error: '',
            timestamp: data.timestamp,
            tokenBalanceChanges: {},
            tokenTransfers: []
        });

        const storedTx = await db.storeTransaction(data.userId, data.workspace, txSynced);
        // if (storedTx)
        //     await publish('bill-usage', { userId: data.userId, timestamp: data.timestamp });

        if (!txSynced.to && sTransactionReceipt) {
            const canSync = await db.canUserSyncContract(data.userId, data.workspace);
            if (canSync)
                await db.storeContractData(data.userId, data.workspace, sTransactionReceipt.contractAddress, {
                    address: sTransactionReceipt.contractAddress,
                    timestamp: data.timestamp
                });
        }

        await transactionsLib.processTransactions(data.userId, data.workspace, [txSynced]);
        res.sendStatus(200);
    } catch(error) {
        console.log(error);
        res.sendStatus(400);
    }
});

const port = parseInt(process.env.PORT) || 6000;
app.listen(port, () => {
  console.log(`Tasks: listening on port ${port}`);
});
