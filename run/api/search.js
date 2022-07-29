const express = require('express');
const router = express.Router();
const db = require('../lib/firebase');

router.get('/', async (req, res) => {
    const data = req.query;
    try {
        if (!data.type || !data.query || !data.workspaceId)
            throw new Error('[GET /api/search] Missing parameters.');

        if (['address', 'hash', 'number', 'text'].indexOf(data.type) == -1)
            throw new Error('[GET /api/search] Invalid search type.');

        let results;
        switch(data.type) {
            case 'address':
                results = await db.searchForAddress(data.workspaceId, data.query);
                break;
            case 'hash':
                results = await db.searchForHash(data.workspaceId, data.query);
                break;
            case 'number':
                results = await db.searchForNumber(data.workspaceId, data.query);
                break;
            case 'text':
            default:
                results = await db.searchForText(data.workspaceId, data.query);
                break;
        }

        res.status(200).json(results);
    } catch(error) {
        console.log(error);
        console.log(data);
        res.status(400).send(error.message);
    }
});

module.exports = router;
