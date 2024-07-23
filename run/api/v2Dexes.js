const express = require('express');
const router = express.Router();
const logger = require('../lib/logger');
const db = require('../lib/firebase');
const { DexFactoryConnector } = require('../lib/rpc');
const authMiddleware = require('../middlewares/auth');

router.get('/:id/status', authMiddleware, async (req, res) => {
    const data = { ...req.body.data, ...req.query };

    try {
        const pairCount = await db.getV2DexPairCount(data.user.id, req.params.id);
        const dex = await db.getExplorerV2Dex(req.params.id);
        const dexFactoryConnector = new DexFactoryConnector(dex.explorer.workspace.rpcServer, dex.factoryAddress);
        const totalPairs = await dexFactoryConnector.allPairsLength();

        res.status(200).json({ pairCount, totalPairs: parseInt(totalPairs.toString()) });
    } catch(error) {
        logger.error(error.message, { location: 'get.api.v2_dexes.id.status', error });
        res.status(400).send(error.message);
    }
});

router.delete('/:id', authMiddleware, async (req, res) => {
    const data = req.body.data;

    try {
        await db.deleteV2Dex(data.uid, req.params.id);

        res.sendStatus(200);
    } catch(error) {
        logger.error(error.message, { location: 'delete.api.v2_dexes.id', error, data });
        res.status(400).send(error.message);
    }
});

router.put('/:id/deactivate', authMiddleware, async (req, res) => {
    const data = req.body.data;

    try {
        await db.deactivateV2Dex(data.uid, req.params.id);

        res.sendStatus(200);
    } catch(error) {
        logger.error(error.message, { location: 'put.api.v2_dexes.id.activate', error, data });
        res.status(400).send(error.message);
    }
});

router.put('/:id/activate', authMiddleware, async (req, res) => {
    const data = req.body.data;

    try {
        await db.activateV2Dex(data.uid, req.params.id);

        res.sendStatus(200);
    } catch(error) {
        logger.error(error.message, { location: 'put.api.v2_dexes.id.activate', error, data });
        res.status(400).send(error.message);
    }
});


router.get('/:id/pairs', async (req, res) => {
    try {
        const { page = 1, itemsPerPage = 10, order = 'DESC' } = req.query;

        const dex = await db.getExplorerV2Dex(req.params.id);
        if (!dex)
            throw new Error('Could not find dex');

        const { count, pairs } = await db.fetchPairsWithLatestReserves(dex.id, page, itemsPerPage, order);

        res.status(200).json({ count, pairs });
    } catch (error) {
        logger.error(error.message, { location: 'get.api.v2_dexes.id.pairs', error });
        res.status(400).send(error.message);
    }
});

router.get('/:id/quote', async (req, res) => {
    try {
        if (!req.query.from || !req.query.to || !req.query.amount)
            throw new Error('Missing parameters');

        const dex = await db.getExplorerV2Dex(req.params.id)
        if (!dex)
            throw new Error('Could not find dex');

        const quote = await db.getV2DexQuote(dex.id, req.query.from, req.query.to, req.query.amount, req.query.direction, req.query.slippageTolerance);

        res.status(200).json({ quote });
    } catch(error) {
        logger.error(error.message, { location: 'get.api.v2_dexes.id.quote', error });
        res.status(400).send(error.message);
    }
});

router.get('/:id/tokens', async (req, res) => {
    try {
        const dex = await db.getExplorerV2Dex(req.params.id)
        if (!dex)
            throw new Error('Could not find dex');

        const tokens = await dex.getAllTokens();

        res.status(200).json({ tokens });
    } catch(error) {
        logger.error(error.message, { location: 'get.api.v2_dexes.id.tokens', error });
        res.status(400).send(error.message);
    }
});

module.exports = router;