const express = require('express');
const router = express.Router();
const db = require('../lib/firebase');
const logger = require('../lib/logger');
const workspaceAuthMiddleware = require('../middlewares/workspaceAuth');

router.get('/transactions', workspaceAuthMiddleware, async (req, res) => {
    const data = req.query;
    try {
        if (!data.workspace || !data.from || !data.to)
            throw new Error('Missing parameters.');

        const transactions = await db.getTransactionVolume(data.workspace.id, data.from, data.to);

        res.status(200).json(transactions);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.stats.transactions', error });
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
        logger.error(error.message, { location: 'get.api.stats.tokenTransferVolume', error });
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
        logger.error(error.message, { location: 'get.api.stats.uniqueWalletCount', error });
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
        logger.error(error.message, { location: 'get.api.stats.cumulativeWalletCount', error });
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
        logger.error(error.message, { location: 'get.api.stats.deployedContractCount', error });
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
        logger.error(error.message, { location: 'get.api.stats.getCumulativeDeployedContractCount', error });
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
        logger.error(error.message, { location: 'get.api.stats.averageGasPrice', error });
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

router.get('/txCount24h', workspaceAuthMiddleware, async (req, res) => {
    const data = req.query;
    try {
        if (!data.workspace)
            throw new Error('Missing parameters.');

        const ts24hago = new Date(new Date().getTime() - (24 * 3600 *1000));
        const count = await db.getTotalTxCount(data.workspace.id, ts24hago);

        res.status(200).json({ count });
    } catch(error) {
        logger.error(error.message, { location: 'get.api.stats.txCount24h', error: error, data: data });
        res.status(400).send(error.message);
    }
});

router.get('/txCountTotal', workspaceAuthMiddleware, async (req, res) => {
    const data = req.query;
    try {
        if (!data.workspace)
            throw new Error('Missing parameters.');

        const count = await db.getTotalTxCount(data.workspace.id);

        res.status(200).json({ count });
    } catch(error) {
        logger.error(error.message, { location: 'get.api.stats.txCountTotal', error: error, data: data });
        res.status(400).send(error.message);
    }
});

router.get('/activeWalletCount', workspaceAuthMiddleware, async (req, res) => {
    const data = req.query;
    try {
        if (!data.workspace)
            throw new Error('Missing parameters.');

        const count = await db.getActiveWalletCount(data.workspace.id);

        res.status(200).json({ count });
    } catch(error) {
        logger.error(error.message, { location: 'get.api.stats.activeWalletCount', error: error, data: data });
        res.status(400).send(error.message);
    }
});

module.exports = router;
