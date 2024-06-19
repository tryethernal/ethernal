const express = require('express');
const router = express.Router();
const logger = require('../lib/logger');
const db = require('../lib/firebase');

router.get('/:id/tokens', async (req, res) => {
    try {
        const dex = await db.getExplorerV2Dex(req.params.id)
        if (!dex)
            throw new Error('Could not find dex');

        const allTokens = dex.pairs
            .map(pair => {
                return [pair.token0, pair.token1]
            })
            .flat();
        
        const uniqueTokens = [...new Map(allTokens.map(obj => [JSON.stringify(obj), obj])).values()];

        res.status(200).json({ tokens: uniqueTokens });
    } catch(error) {
        logger.error(error.message, { location: 'get.api.v2_dexes.id.tokens', error });
        res.status(400).send(error.message);
    }
});

module.exports = router;