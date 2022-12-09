const express = require('express');
const router = express.Router();
const logger = require('../lib/logger');
const db = require('../lib/firebase');

router.get('/', async (req, res) => {
    const data = req.query;

    try {
        if (!data.domain && !data.slug)
            throw new Error('Missing parameters.')

        let explorer;

        if (data.domain)
            explorer = await db.getPublicExplorerParamsByDomain(data.domain);
        else
            explorer = await db.getPublicExplorerParamsBySlug(data.slug);

        if (explorer)
            res.status(200).json(explorer);
        else
            throw new Error('Could not find explorer.');
    } catch(error) {
        logger.error(error.message, { location: 'get.api.explorers', error: error, data: data, queryParams: req.params });
        res.status(400).send(error.message);
    }
});

module.exports = router;
