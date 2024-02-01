const express = require('express');
const router = express.Router();
const db = require('../lib/firebase');
const logger = require('../lib/logger');
const workspaceAuthMiddleware = require('../middlewares/workspaceAuth');

router.get('/wallets', workspaceAuthMiddleware, async (req, res) => {
    const data = req.query;
    try {
        if (!data.workspace)
            throw new Error('Missing parameters.');

        const wallets = await db.getWalletVolume(data.workspace.id);

        res.status(200).json(wallets);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.stats.wallets', error: error, data: data });
        res.status(400).send(error.message);
    }
});

router.get('/transactions', workspaceAuthMiddleware, async (req, res) => {
    const data = req.query;
    try {
        if (!data.workspace || !data.from || !data.to)
            throw new Error('Missing parameters.');

        const transactions = await db.getTransactionVolume(data.workspace.id, data.from, data.to);

        res.status(200).json(transactions);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.stats.transactions', error: error, data: data });
        res.status(400).send(error.message);
    }
});

router.get('/tokenTransferVolume', workspaceAuthMiddleware, async (req, res) => {
    const data = req.query;
    try {
        if (!data.workspace || !data.from || !data.to)
            throw new Error('Missing parameters.');

        const transfers = await db.getTokenTransferVolume(data.workspace.id, data.from, data.to, data.address, data.type);

        res.status(200).json(transfers);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.stats.tokenTransferVolume', error: error, data: data });
        res.status(400).send(error.message);
    }
});

router.get('/uniqueWalletCount', workspaceAuthMiddleware, async (req, res) => {
    const data = req.query;
    try {
        if (!data.workspace || !data.from || !data.to)
            throw new Error('Missing parameters.');

        const uniqueWalletCount = await db.getUniqueWalletCount(data.workspace.id, data.from, data.to);

        res.status(200).json(uniqueWalletCount);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.stats.uniqueWalletCount', error: error, data: data });
        res.status(400).send(error.message);
    }
});

router.get('/cumulativeWalletCount', workspaceAuthMiddleware, async (req, res) => {
    const data = req.query;
    try {
        if (!data.workspace || !data.from || !data.to)
            throw new Error('Missing parameters.');

        const cumulativeWalletCount = await db.getCumulativeWalletCount(data.workspace.id, data.from, data.to);

        res.status(200).json(cumulativeWalletCount);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.stats.cumulativeWalletCount', error: error, data: data });
        res.status(400).send(error.message);
    }
});

router.get('/deployedContractCount', workspaceAuthMiddleware, async (req, res) => {
    const data = req.query;
    try {
        if (!data.workspace || !data.from || !data.to)
            throw new Error('Missing parameters.');

        const deployedContractCount = await db.getDeployedContractCount(data.workspace.id, data.from, data.to);

        res.status(200).json(deployedContractCount);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.stats.deployedContractCount', error: error, data: data });
        res.status(400).send(error.message);
    }
});

router.get('/cumulativeDeployedContractCount', workspaceAuthMiddleware, async (req, res) => {
    const data = req.query;
    try {
        if (!data.workspace || !data.from || !data.to)
            throw new Error('Missing parameters.');

        const cumulativeDeployedContractCount = await db.getCumulativeDeployedContractCount(data.workspace.id, data.from, data.to);

        res.status(200).json(cumulativeDeployedContractCount);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.stats.getCumulativeDeployedContractCount', error: error, data: data });
        res.status(400).send(error.message);
    }
});

router.get('/averageGasPrice', workspaceAuthMiddleware, async (req, res) => {
    const data = req.query;
    try {
        if (!data.workspace || !data.from || !data.to)
            throw new Error('Missing parameters.');

        const avgGasPrice = await db.getAverageGasPrice(data.workspace.id, data.from, data.to);

        res.status(200).json(avgGasPrice);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.stats.averageGasPrice', error: error, data: data });
        res.status(400).send(error.message);
    }
});

router.get('/averageTransactionFee', workspaceAuthMiddleware, async (req, res) => {
    const data = req.query;
    try {
        if (!data.workspace || !data.from || !data.to)
            throw new Error('Missing parameters.');

        const avgTransactionFee = await db.getAverageTransactionFee(data.workspace.id, data.from, data.to);

        res.status(200).json(avgTransactionFee);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.stats.averageTransactionFee', error: error, data: data });
        res.status(400).send(error.message);
    }
});

router.get('/global', workspaceAuthMiddleware, async (req, res) => {
    const data = req.query;
    try {
        if (!data.workspace)
            throw new Error('Missing parameters.');

        const ts24hago = new Date(new Date().getTime() - (24 * 3600 *1000));
        const txCount24h = await db.getTxCount(data.workspace.id, ts24hago);
        const txCountTotal = await db.getTotalTxCount(data.workspace.id);
        const activeWalletCount = await db.getActiveWalletCount(data.workspace.id);

        const results = {
            txCount24h: txCount24h,
            txCountTotal: txCountTotal,
            activeWalletCount: activeWalletCount
        };

        res.status(200).json(results);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.stats.global', error: error, data: data });
        res.status(400).send(error.message);
    }
});

module.exports = router;
