const express = require('express');
const router = express.Router();
const db = require('../lib/firebase');
const { getMaxV2DexPairsForTrial } = require('../lib/env');
const { DexFactoryConnector } = require('../lib/rpc');
const authMiddleware = require('../middlewares/auth');
const { managedError, unmanagedError } = require('../lib/errors');

router.get('/:id/status', authMiddleware, async (req, res, next) => {
    const data = { ...req.body.data, ...req.query };

    try {
        const dex = await db.getExplorerV2Dex(req.params.id);
        if (!dex)
            return managedError(new Error('Could not find dex'), req, res);

        const pairCount = await db.getV2DexPairCount(data.user.id, req.params.id);
        const dexFactoryConnector = new DexFactoryConnector(dex.explorer.workspace.rpcServer, dex.factoryAddress);
        const totalPairs = parseInt((await dexFactoryConnector.allPairsLength()).toString());

        const maxPairs = dex.explorer.isDemo || dex.explorer.stripeSubscription.isTrialing ? getMaxV2DexPairsForTrial() : totalPairs;

        res.status(200).json({ pairCount, totalPairs: maxPairs });
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.delete('/:id', authMiddleware, async (req, res, next) => {
    const data = req.body.data;

    try {
        await db.deleteV2Dex(data.uid, req.params.id);

        res.sendStatus(200);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.put('/:id/deactivate', authMiddleware, async (req, res, next) => {
    const data = req.body.data;

    try {
        await db.deactivateV2Dex(data.uid, req.params.id);

        res.sendStatus(200);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.put('/:id/activate', authMiddleware, async (req, res, next) => {
    const data = req.body.data;

    try {
        await db.activateV2Dex(data.uid, req.params.id);

        res.sendStatus(200);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/:id/pairs', async (req, res, next) => {
    try {
        const { page = 1, itemsPerPage = 10, order = 'DESC' } = req.query;

        const dex = await db.getExplorerV2Dex(req.params.id);
        if (!dex)
            return managedError(new Error('Could not find dex'), req, res);

        const { count, pairs } = await db.fetchPairsWithLatestReserves(dex.id, page, itemsPerPage, order);

        res.status(200).json({ count, pairs });
    } catch (error) {
        unmanagedError(error, req, next);
    }
});

router.get('/:id/quote', async (req, res, next) => {
    try {
        if (!req.query.from || !req.query.to || !req.query.amount)
            return managedError(new Error('Missing parameters'), req, res);

        const dex = await db.getExplorerV2Dex(req.params.id)
        if (!dex)
            return managedError(new Error('Could not find dex'), req, res);

        const quote = await db.getV2DexQuote(dex.id, req.query.from, req.query.to, req.query.amount, req.query.direction, req.query.slippageTolerance);

        res.status(200).json({ quote });
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/:id/tokens', async (req, res, next) => {
    try {
        const dex = await db.getExplorerV2Dex(req.params.id)
        if (!dex)
            return managedError(new Error('Could not find dex'), req, res);

        const tokens = await dex.getAllTokens();

        res.status(200).json({ tokens });
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

module.exports = router;
