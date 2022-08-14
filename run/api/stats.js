const express = require('express');
const router = express.Router();
const db = require('../lib/firebase');
const workspaceAuthMiddleware = require('../middlewares/workspaceAuth');

router.get('/wallets', workspaceAuthMiddleware, async (req, res) => {
    const data = req.query;
    try {
        if (!data.workspace || !data.from || !data.to)
            throw new Error('[GET /api/stats/wallets] Missing parameters.');
        if (!data.workspace.public)
            throw new Error('[GET /api/stats/wallets] This endpoint is not available on private workspaces.');

        const wallets = await db.getWalletVolume(data.workspace.id, data.from, data.to);

        res.status(200).json(wallets);
    } catch(error) {
        console.log(error);
        console.log(data);
        res.status(400).send(error.message);
    }
});

router.get('/transactions', workspaceAuthMiddleware, async (req, res) => {
    const data = req.query;
    try {
        if (!data.workspace || !data.from || !data.to)
            throw new Error('[GET /api/stats/transactions] Missing parameters.');
        if (!data.workspace.public)
            throw new Error('[GET /api/stats/transactions] This endpoint is not available on private workspaces.');

        const transactions = await db.getTransactionVolume(data.workspace.id, data.from, data.to);

        res.status(200).json(transactions);
    } catch(error) {
        console.log(error);
        console.log(data);
        res.status(400).send(error.message);
    }
});

router.get('/global', workspaceAuthMiddleware, async (req, res) => {
    const data = req.query;
    try {
        if (!data.workspace)
            throw new Error('[GET /api/stats/global] Missing parameters.');
        if (!data.workspace.public)
            throw new Error('[GET /api/stats/global] This endpoint is not available on private workspaces.');

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
        console.log(error);
        console.log(data);
        res.status(400).send(error.message);
    }
});

module.exports = router;
