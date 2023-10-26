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
        if (!data.workspace)
            throw new Error('Missing parameters.');

        const transactions = await db.getTransactionVolume(data.workspace.id);

        res.status(200).json(transactions);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.stats.transactions', error: error, data: data });
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
