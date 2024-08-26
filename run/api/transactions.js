const express = require('express');
const logger = require('../lib/logger');
const { stringifyBns, sanitize } = require('../lib/utils');
const db = require('../lib/firebase');
const authMiddleware = require('../middlewares/auth');
const workspaceAuthMiddleware = require('../middlewares/workspaceAuth');
const browserSyncMiddleware = require('../middlewares/browserSync');
const { processTransactions } = require('../lib/transactions');
const { getAppDomain } = require('../lib/env');
const { transactionFn } = require('../lib/codeRunner');
const { managedError, unmanagedError } = require('../lib/errors');

const router = express.Router();

router.get('/failedProcessable', authMiddleware, async (req, res, next) => {
    const data = req.query;

    try {
        const transactions = await db.getFailedProcessableTransactions(data.firebaseUserId, data.workspace);

        res.status(200).json(transactions);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/processable', authMiddleware, async (req, res, next) => {
    const data = req.query;

    try {
        const transactions = await db.getProcessableTransactions(data.firebaseUserId, data.workspace);

        res.status(200).json(transactions)
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.post('/', [authMiddleware, browserSyncMiddleware], async (req, res, next) => {
    const data = req.body.data;

    try {
        if (!data.uid ||  !data.workspace || !data.block || !data.transaction)
            return managedError(new Error('Missing parameter.'), req, res);

        const transaction = data.transaction;
        const receipt = data.transactionReceipt;

        const canUserSyncBlock = await db.canUserSyncBlock(data.user.id);
        if (!canUserSyncBlock)
            return managedError(new Error(`You are on a free plan with more than one workspace. Please upgrade your plan, or delete your extra workspaces here: https://app.${getAppDomain()}/settings.`), req, res);

        const sTransactionReceipt = receipt ? stringifyBns(sanitize(receipt)) : null;
        const sTransaction = stringifyBns(sanitize(transaction));

        const txSynced = sanitize({
            ...sTransaction,
            receipt: sTransactionReceipt,
            timestamp: data.block.timestamp,
        });

        await db.storeTransaction(data.uid, data.workspace, txSynced);

       res.sendStatus(200);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.post('/:hash/error', authMiddleware, async (req, res, next) => {
    const data = req.body.data;

    try {
        if (!data.uid || !data.workspace || !req.params.hash || !data.error)
            return managedError(new Error('Missing parameter.'), req, res);

        await db.storeFailedTransactionError(data.uid, data.workspace, req.params.hash, data.error);

       res.sendStatus(200);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.post('/:hash/process', authMiddleware, async (req, res, next) => {
    const data = req.body.data;
    
    try {
        if (!data.uid || !data.workspace || !req.params.hash)
            return managedError(new Error('Missing parameter.'), req, res);

        const transaction = await db.getTransaction(data.uid, data.workspace, req.params.hash);
        await processTransactions([transaction.id]);

        res.sendStatus(200);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.post('/:hash/tokenBalanceChanges', authMiddleware, async (req, res, next) => {
    const data = req.body.data;

    try {
        if (!data.uid || !data.workspace || !req.params.hash || !data.changes || !data.tokenTransferId)
            return managedError(new Error('Missing parameter.'), req, res);
        
        await db.storeTokenBalanceChanges(data.uid, data.workspace, data.tokenTransferId, data.changes);

        res.sendStatus(200);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.post('/:hash/trace', authMiddleware, async (req, res, next) => {
    const data = req.body.data;

    try {
        if (!data.uid || !data.workspace || !req.params.hash || !data.steps)
            return managedError(new Error('Missing parameter.'), req, res);
        
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
        unmanagedError(error, req, next);
    }
});

router.post('/:hash/storage', workspaceAuthMiddleware, async (req, res, next) => {
    const data = { ...req.query, ...req.body.data };

    try {
        if (!data.firebaseUserId || !data.workspace || !data.data)
            return managedError(new Error('Missing parameter.'), req, res);

        await db.storeTransactionData(data.firebaseUserId, data.workspace, req.params.hash, data.data);

        res.sendStatus(200);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/', workspaceAuthMiddleware, async (req, res, next) => {
    const data = { ...req.query, ...req.params };

    try {
        const transactions = await db.getWorkspaceTransactions(data.workspace.id, data.page, data.itemsPerPage, data.order, data.orderBy, data.withCount);

        res.status(200).json(transactions);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/:hash', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;

    try {
        if (!req.params.hash)
            return managedError(new Error('Missing parameter'), req, res);

        const transaction = await db.getWorkspaceTransaction(data.workspace.id, req.params.hash);
        const customTransactionFunction = await db.getCustomTransactionFunction(data.workspace.id);
        const customFields = customTransactionFunction ?
            await transactionFn(customTransactionFunction, transaction.raw, data.workspace.rpcServer) :
            { overrides: {}, extraFields: [] };

        res.status(200).json({ ...transaction, ...customFields.overrides, extraFields: customFields.extraFields });
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/:hash/tokenTransfers', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;

    try {
        if (!req.params.hash)
            return managedError(new Error('Missing parameter'), req, res);

        const result = await db.getTransactionTokenTransfers(data.workspace.id, req.params.hash, data.page, data.itemsPerPage, data.order);

        res.status(200).json(result);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/:hash/logs', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;

    try {
        if (!req.params.hash)
            return managedError(new Error('Missing parameter'), req, res);

        const result = await db.getTransactionLogs(data.workspace.id, req.params.hash, data.page, data.itemsPerPage);

        res.status(200).json(result);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

module.exports = router;
