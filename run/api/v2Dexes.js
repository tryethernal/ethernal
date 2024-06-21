const express = require('express');
const router = express.Router();
const logger = require('../lib/logger');
const db = require('../lib/firebase');

router.get('/:id/routes', async (req, res) => {
    try {
        if (!req.query.from || !req.query.to)
            throw new Error('Missing parameters');

        const dex = await db.getExplorerV2Dex(req.params.id)
        if (!dex)
            throw new Error('Could not find dex');

        const tokens = await dex.getAllTokens();

        res.status(200).json({ tokens });
    } catch(error) {
        logger.error(error.message, { location: 'get.api.v2_dexes.id.route', error });
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