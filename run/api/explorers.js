const express = require('express');
const router = express.Router();
const db = require('../lib/firebase');

router.get('/', async (req, res) => {
    const data = req.query;
    try {
        if (!data.domain && !data.slug)
            throw new Error('[GET /api/explorers] Missing parameters.')

        let explorer;

        if (data.domain)
            explorer = await db.getPublicExplorerParamsByDomain(data.domain);
        else
            explorer = await db.getPublicExplorerParamsBySlug(data.domain);

        if (explorer)
            res.status(200).json(explorer);
        else
            throw new Error('[GET /api/explorers] Could not find explorer');
    } catch(error) {
        console.log(error);
        console.log(data);
        res.status(400).send(error.message);
    }
});

module.exports = router;
