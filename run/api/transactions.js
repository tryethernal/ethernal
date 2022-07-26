const express = require('express');
const { stringifyBns, sanitize } = require('../lib/utils');
const db = require('../lib/firebase');
const authMiddleware = require('../middlewares/auth');
const workspaceAuthMiddleware = require('../middlewares/workspaceAuth');
const { processTransactions } = require('../lib/transactions');
const { enqueueTask } = require('../lib/tasks');

const router = express.Router();

router.get('/failedProcessable', authMiddleware, async (req, res) => {
    const data = req.query;
    console.log(data);
    try {
        const transactions = await db.getFailedProcessableTransactions(data.firebaseUserId, data.workspace);

        res.status(200).json(transactions);
    } catch(error) {
        console.log(error);
        res.status(400).send(error);
    }
});

router.get('/processable', authMiddleware, async (req, res) => {
    const data = req.query;
    console.log(data);
    try {
        const transactions = await db.getProcessableTransactions(data.firebaseUserId, data.workspace);

        res.status(200).json(transactions);
    } catch(error) {
        console.log(error);
        res.status(400).send(error);
    }
});

router.post('/', authMiddleware, async (req, res) => {
    const data = req.body.data;
    try {
        if (!data.uid ||  !data.workspace || !data.block || !data.transaction) {
            console.log(data);
            throw new Error('[POST /api/transactions] Missing parameter.');
        }

        const promises = [];
        const transaction = data.transaction;
        const receipt = data.transactionReceipt;

        const sTransactionReceipt = receipt ? stringifyBns(sanitize(receipt)) : null;
        const sTransaction = stringifyBns(sanitize(transaction));

        const txSynced = sanitize({
            ...sTransaction,
            receipt: sTransactionReceipt,
            timestamp: data.block.timestamp,
        });

        const storedTx = await db.storeTransaction(data.uid, data.workspace, txSynced);

        // TODO: Bill usage

        if (!txSynced.to && sTransactionReceipt) {
            const canSync = await db.canUserSyncContract(data.uid, data.workspace, sTransactionReceipt.contractAddress);

            if (canSync)
                await db.storeContractData(data.uid, data.workspace, sTransactionReceipt.contractAddress, {
                    address: sTransactionReceipt.contractAddress,
                    timestamp: data.block.timestamp
                });
        }

        await enqueueTask('transactionProcessing', {
            userId: data.uid,
            workspace: data.workspace,
            transaction: txSynced,
            secret: process.env.AUTH_SECRET
        });
       
       res.sendStatus(200);
    } catch(error) {
        console.log(error);
        res.status(400).send(error);
    }
});

router.post('/:hash/error', authMiddleware, async (req, res) => {
    const data = req.body.data;

    try {
        if (!data.uid || !data.workspace || !req.params.hash || !data.error) {
            console.log(data);
            throw new Error('[POST /api/transactions/:hash/error] Missing parameter.');
        }

        await db.storeFailedTransactionError(data.uid, data.workspace, req.params.hash, data.error);
       
       res.sendStatus(200);
    } catch(error) {
        console.log(error);
        res.status(400).send(error);
    }
});

router.post('/:hash/process', authMiddleware, async (req, res) => {
    const data = req.body.data;
    
    try {
        if (!data.uid || !data.workspace || !req.params.hash) {
            console.log(data);
            throw new Error('[POST /api/transactions/:hash/process] Missing parameter.');
        }

        const transaction = await db.getTransaction(data.uid, data.workspace, req.params.hash);
        await processTransactions(data.uid, data.workspace, [transaction]);

        res.sendStatus(200);
    } catch(error) {
        console.log(error);
        res.status(400).send(error);
    }
});

router.post('/:hash/tokenBalanceChanges', authMiddleware, async (req, res) => {
    const data = req.body.data;

    try {
        if (!data.uid || !data.workspace || !req.params.hash || !data.tokenBalanceChanges) {
            console.log(data);
            throw new Error('[POST /api/transactions/:hash/tokenBalanceChanges] Missing parameter.');
        }
        
        await db.storeTokenBalanceChanges(data.uid, data.workspace, req.params.hash, data.tokenBalanceChanges);

        res.sendStatus(200);
    } catch(error) {
        console.log(error);
        res.status(400).send(error);
    }
});

router.post('/:hash/trace', authMiddleware, async (req, res) => {
    const data = req.body.data;

    try {
        if (!data.uid || !data.workspace || !req.params.hash || !data.steps) {
            console.log(data);
            throw new Error('[POST /api/transactions/:hash/trace] Missing parameter.');
        }
        
        const trace = [];
        for (const step of data.steps) {
            if (['CALL', 'CALLCODE', 'DELEGATECALL', 'STATICCALL', 'CREATE', 'CREATE2'].indexOf(step.op.toUpperCase()) > -1) {
                let contractRef;                
                const canSync = await db.canUserSyncContract(data.uid, data.workspace, step.address);

                if (canSync) {
                    const contractData = sanitize({
                        address: step.address.toLowerCase(),
                        hashedBytecode: step.contractHashedBytecode
                    });

                    await db.storeContractData(
                        data.uid,
                        data.workspace,
                        step.address,
                        contractData
                    );
                }

                trace.push(step);
            }
        }

        await db.storeTrace(data.uid, data.workspace, req.params.hash, trace);

        res.sendStatus(200);
    } catch(error) {
        console.log(error);
        res.status(400).send(error);
    }
});

router.post('/:hash/storage', authMiddleware, async (req, res) => {
    const data = req.body.data;
    
    try {
        if (!data.uid || !data.workspace || !data.data) {
            console.log(data);
            throw new Error('[POST /api/transactions/:hash/storage] Missing parameter.');
        }

        await db.storeTransactionData(data.uid, data.workspace, req.params.hash, data.data);

        res.sendStatus(200);
    } catch(error) {
        console.log(error);
        res.status(400).send(error);
    }
});

router.get('/', workspaceAuthMiddleware, async (req, res) => {
    const data = req.query;

    try {
        const transactions = await db.getWorkspaceTransactions(data.workspace.id, data.page, data.itemsPerPage, data.order || 'DESC');

        res.status(200).json(transactions);
    } catch(error) {
        console.log(error);
        res.status(400).send(error);
    }
});

router.get('/:hash', workspaceAuthMiddleware, async (req, res) => {
    try {
        const data = req.query;
        if (!req.params.hash)
            throw '[GET /api/transactions/:hash] Missing parameter';

        const transaction = await db.getWorkspaceTransaction(data.workspace.id, req.params.hash);

        res.status(200).json(transaction);
    } catch(error) {
        console.log(error);
        res.status(400).send(error);
    }
})


module.exports = router;