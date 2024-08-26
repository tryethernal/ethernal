const express = require('express');
const router = express.Router();
const db = require('../lib/firebase');
const workspaceAuthMiddleware = require('../middlewares/workspaceAuth');
const { managedError, unmanagedError } = require('../lib/errors');

router.get('/transactions', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;
    try {
        if (!data.workspace || !data.from || !data.to)
            return managedError(new Error('Missing parameters.'), req, res);

        const transactions = await db.getTransactionVolume(data.workspace.id, data.from, data.to);

        res.status(200).json(transactions);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/tokenTransferVolume', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;
    try {
        if (!data.workspace || !data.from || !data.to)
            return managedError(new Error('Missing parameters.'), req, res);

        const transfers = await db.getTokenTransferVolume(data.workspace.id, data.from, data.to, data.address, data.type);

        res.status(200).json(transfers);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/uniqueWalletCount', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;
    try {
        if (!data.workspace || !data.from || !data.to)
            return managedError(new Error('Missing parameters.'), req, res);

        const uniqueWalletCount = await db.getUniqueWalletCount(data.workspace.id, data.from, data.to);

        res.status(200).json(uniqueWalletCount);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/cumulativeWalletCount', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;
    try {
        if (!data.workspace || !data.from || !data.to)
            return managedError(new Error('Missing parameters.'), req, res);

        const cumulativeWalletCount = await db.getCumulativeWalletCount(data.workspace.id, data.from, data.to);

        res.status(200).json(cumulativeWalletCount);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/deployedContractCount', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;
    try {
        if (!data.workspace || !data.from || !data.to)
            return managedError(new Error('Missing parameters.'), req, res);

        const deployedContractCount = await db.getDeployedContractCount(data.workspace.id, data.from, data.to);

        res.status(200).json(deployedContractCount);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/cumulativeDeployedContractCount', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;
    try {
        if (!data.workspace || !data.from || !data.to)
            return managedError(new Error('Missing parameters.'), req, res);

        const cumulativeDeployedContractCount = await db.getCumulativeDeployedContractCount(data.workspace.id, data.from, data.to);

        res.status(200).json(cumulativeDeployedContractCount);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/averageGasPrice', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;
    try {
        if (!data.workspace || !data.from || !data.to)
            return managedError(new Error('Missing parameters.'), req, res);

        const avgGasPrice = await db.getAverageGasPrice(data.workspace.id, data.from, data.to);

        res.status(200).json(avgGasPrice);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/averageTransactionFee', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;
    try {
        if (!data.workspace || !data.from || !data.to)
            return managedError(new Error('Missing parameters.'), req, res);

        const avgTransactionFee = await db.getAverageTransactionFee(data.workspace.id, data.from, data.to);

        res.status(200).json(avgTransactionFee);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/txCount24h', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;
    try {
        if (!data.workspace)
            return managedError(new Error('Missing parameters.'), req, res);

        const ts24hago = new Date(new Date().getTime() - (24 * 3600 *1000));
        const count = await db.getTotalTxCount(data.workspace.id, ts24hago);

        res.status(200).json({ count });
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/txCountTotal', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;
    try {
        if (!data.workspace)
            return managedError(new Error('Missing parameters.'), req, res);

        const count = await db.getTotalTxCount(data.workspace.id);

        res.status(200).json({ count });
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/activeWalletCount', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;
    try {
        if (!data.workspace)
            return managedError(new Error('Missing parameters.'), req, res);

        const count = await db.getActiveWalletCount(data.workspace.id);

        res.status(200).json({ count });
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

module.exports = router;
