const express = require('express');
const { isGoogleApiEnabled } = require('../lib/flags');
const axios = require('axios');
const router = express.Router();
const logger = require('../lib/logger');
const db = require('../lib/firebase');
const workspaceAuthMiddleware = require('../middlewares/workspaceAuth');
const authMiddleware = require('../middlewares/auth');

router.get('/icons', authMiddleware, async (req, res) => {
    const data = req.query;
    try {
        if (!data.icon)
            throw new Error('Missing parameters');

        const { data: rawIcons } = await axios.get(`https://raw.githubusercontent.com/Templarian/MaterialDesign-SVG/master/meta.json`);
        const icons = rawIcons.filter(ri => {
            const labels = [ri.name, ...ri.aliases, ...ri.tags, ...ri.styles];
            for (let i = 0; i < labels.length; i++)
                if (labels[i].includes(data.icon))
                    return true;
        });

        res.status(200).json(icons)
    } catch(error) {
        logger.error(error.message, { location: 'get.api.search', error });
        res.status(400).send(error.message);
    }
});

router.get('/fonts', authMiddleware, async (req, res) => {
    const data = req.query;
    try {
        if (!isGoogleApiEnabled())
            throw new Error('Enable Google Font API to use this endpoint.')

        if (!data.font)
            throw new Error('Missing parameters');

        const { data: rawFonts } = await axios.get(`https://www.googleapis.com/webfonts/v1/webfonts?key=${process.env.GOOGLE_API_KEY}`);
        const fonts = rawFonts.items
            .filter(rf => rf.family.toLowerCase().includes(data.font))
            .map(rf => rf.family);

        res.status(200).json(fonts)
    } catch(error) {
        logger.error(error.message, { location: 'get.api.search', error });
        res.status(400).send(error.message);
    }
});

router.get('/', workspaceAuthMiddleware, async (req, res) => {
    const data = req.query;
    try {
        if (!data.type || !data.query || !data.workspace)
            throw new Error('Missing parameters.');

        if (['address', 'hash', 'number', 'text'].indexOf(data.type) == -1)
            throw new Error('Invalid search type.');

        let results = [];
        if (data.query.length > 2 || data.type == 'number') {
            switch(data.type) {
                case 'address':
                    results = await db.searchForAddress(data.workspace.id, data.query);
                    break;
                case 'hash':
                    results = await db.searchForHash(data.workspace.id, data.query);
                    break;
                case 'number':
                    results = await db.searchForNumber(data.workspace.id, data.query);
                    break;
                case 'text':
                default:
                    results = await db.searchForText(data.workspace.id, data.query);
                    break;
            }
        }

        res.status(200).json(results);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.search', error });
        res.status(400).send(error.message);
    }
});

module.exports = router;
