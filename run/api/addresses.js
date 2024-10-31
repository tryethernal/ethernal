const express = require('express');
const router = express.Router();
const db = require('../lib/firebase');
const { ProviderConnector } = require('../lib/rpc');
const workspaceAuthMiddleware = require('../middlewares/workspaceAuth');
const { managedError, unmanagedError } = require('../lib/errors');

router.get('/:address/tokenTransfers', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;

    try {
        if (!req.params.address)
            return managedError(new Error('[GET /:address/tokenTransfers] Missing parameter'), req, res);

        const result = await db.getAddressTokenTransfers(data.workspace.id, req.params.address, data.page, data.itemsPerPage, data.orderBy, data.order);

        res.status(200).json(result);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/:address/stats', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;

    try {
        if (!req.params.address)
            return managedError(new Error('[GET /:address/stats] Missing parameter'), req, res);

        const stats = await db.getAddressStats(data.workspace.id, req.params.address);

        res.status(200).json(stats);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/:address/nativeTokenBalance', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;

    try {
        const provider = new ProviderConnector(data.workspace.rpcServer);

        let balance;
        try {
            balance = await provider.getBalance(req.params.address);
        } catch(error) {
            return managedError(error, req, res, 400, false);
        }

        res.status(200).json({ balance: balance ? balance.toString() : null });
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/:address/balances', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;

    try {
        if (!req.params.address)
            return managedError(new Error('[GET /:address/balances] Missing parameter'), req, res);

        const result = await db.getAddressLatestTokenBalances(data.workspace.id, req.params.address, req.query.patterns);

        res.status(200).json(result);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/:address/transactions', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;

    try {
        const result = await db.getAddressTransactions(data.workspace.id, req.params.address, data.page, data.itemsPerPage, data.order, data.sortBy);

        res.status(200).json(result);
    } catch(error) {
        unmanagedError(error, req, next);
    }
})

module.exports = router;
