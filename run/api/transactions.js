const express = require('express');
const logger = require('../lib/logger');
const { stringifyBns, sanitize } = require('../lib/utils');
const db = require('../lib/firebase');
const authMiddleware = require('../middlewares/auth');
const workspaceAuthMiddleware = require('../middlewares/workspaceAuth');
const { processTransactions } = require('../lib/transactions');
const { enqueue } = require('../lib/queue');

const router = express.Router();

router.get('/failedProcessable', authMiddleware, async (req, res) => {
    const data = req.query;

    try {
        const transactions = await db.getFailedProcessableTransactions(data.firebaseUserId, data.workspace);

        res.status(200).json(transactions);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.transactions.failedProcessable', error: error, data: data });
        res.status(400).send(error.message);
    }
});

router.get('/processable', authMiddleware, async (req, res) => {
    const data = req.query;

    try {
        const transactions = await db.getProcessableTransactions(data.firebaseUserId, data.workspace);

        res.status(200).json(transactions)
    } catch(error) {
        logger.error(error.message, { location: 'get.api.transactions.processable', error: error, data: data });
        res.status(400).send(error.message);
    }
});

router.post('/', authMiddleware, async (req, res) => {
    const data = req.body.data;

    try {
        if (!data.uid ||  !data.workspace || !data.block || !data.transaction)
            throw new Error('Missing parameter.');

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

        if (!txSynced.to && sTransactionReceipt) {
            const canSync = await db.canUserSyncContract(data.uid, data.workspace, sTransactionReceipt.contractAddress);

            if (canSync)
                await db.storeContractData(data.uid, data.workspace, sTransactionReceipt.contractAddress, {
                    address: sTransactionReceipt.contractAddress,
                    timestamp: data.block.timestamp
                });
        }

        await enqueue('transactionProcessing', `transactionProcessing-${txSynced.hash}`, { 
            userId: data.uid,
            workspace: data.workspace,
            transaction: txSynced
        }, 1);
       
       res.sendStatus(200);
    } catch(error) {
        logger.error(error.message, { location: 'post.api.transactions', error: error, data: data });
        res.status(400).send(error.message);
    }
});

router.post('/:hash/error', authMiddleware, async (req, res) => {
    const data = req.body.data;

    try {
        if (!data.uid || !data.workspace || !req.params.hash || !data.error)
            throw new Error('Missing parameter.');

        await db.storeFailedTransactionError(data.uid, data.workspace, req.params.hash, data.error);

       res.sendStatus(200);
    } catch(error) {
        logger.error(error.message, { location: 'post.api.transactions.hash.error', error: error, data: data });
        res.status(400).send(error.message);
    }
});

router.post('/:hash/process', authMiddleware, async (req, res) => {
    const data = req.body.data;
    
    try {
        if (!data.uid || !data.workspace || !req.params.hash)
            throw new Error('Missing parameter.');

        const transaction = await db.getTransaction(data.uid, data.workspace, req.params.hash);
        await processTransactions(data.uid, data.workspace, [transaction]);

        res.sendStatus(200);
    } catch(error) {
        logger.error(error.message, { location: 'post.api.transactions.hash.process', error: error, data: data });
        res.status(400).send(error.message);
    }
});

router.post('/:hash/tokenBalanceChanges', authMiddleware, async (req, res) => {
    const data = req.body.data;

    try {
        if (!data.uid || !data.workspace || !req.params.hash || !data.changes || !data.tokenTransferId)
            throw new Error('Missing parameter.');
        
        await db.storeTokenBalanceChanges(data.uid, data.workspace, data.tokenTransferId, data.changes);

        res.sendStatus(200);
    } catch(error) {
        logger.error(error.message, { location: 'post.api.transactions.hash.tokenBalanceChanges', error: error, data: data });
        res.status(400).send(error.message);
    }
});

router.post('/:hash/trace', authMiddleware, async (req, res) => {
    const data = req.body.data;

    try {
        if (!data.uid || !data.workspace || !req.params.hash || !data.steps)
            throw new Error('Missing parameter.');
        
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
        logger.error(error.message, { location: 'post.api.transactions.hash.trace', error: error, data: data });
        res.status(400).send(error.message);
    }
});

router.post('/:hash/storage', workspaceAuthMiddleware, async (req, res) => {
    const data = { ...req.query, ...req.body.data };

    try {
        if (!data.firebaseUserId || !data.workspace || !data.data)
            throw new Error('Missing parameter.');

        await db.storeTransactionData(data.firebaseUserId, data.workspace, req.params.hash, data.data);

        res.sendStatus(200);
    } catch(error) {
        logger.error(error.message, { location: 'post.api.transactions.hash.storage', error: error, data: data });
        res.status(400).send(error.message);
    }
});

router.get('/', workspaceAuthMiddleware, async (req, res) => {
    const data = req.query;

    try {
        const transactions = await db.getWorkspaceTransactions(data.workspace.id, data.page, data.itemsPerPage, data.order || 'DESC');

        res.status(200).json(transactions);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.transactions', error: error, data: data });
        res.status(400).send(error.message);
    }
});

router.get('/:hash', workspaceAuthMiddleware, async (req, res) => {
    const data = req.query;

    try {
        if (!req.params.hash)
            throw new Error('Missing parameter');

        const transaction = await db.getWorkspaceTransaction(data.workspace.id, req.params.hash);

        res.status(200).json(transaction);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.transactions.hash', error: error, data: data });
        res.status(400).send(error.message);
    }
});

router.get('/:hash/tokenTransfers', workspaceAuthMiddleware, async (req, res) => {
    const data = req.query;

    try {
        if (!req.params.hash)
            throw new Error('Missing parameter');

        const result = await db.getTransactionTokenTransfers(data.workspace.id, req.params.hash, data.page, data.itemsPerPage, data.order);

        res.status(200).json(result);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.transactions.hash.tokenTransfers', error: error, data: data });
        res.status(400).send(error.message);
    }
});

module.exports = router;
