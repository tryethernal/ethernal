const logger = require('../lib/logger');
const jwt = require('jsonwebtoken');
const express = require('express');
const router = express.Router();
const db = require('../lib/firebase');
const authMiddleware = require('../middlewares/auth');

router.get('/productRoadToken', authMiddleware, async (req, res) => {
    const data = { ...req.query, ...req.body.data };
    try {
        if (!process.env.PRODUCT_ROAD_TOKEN)
            return res.status(200).json({ token: null });

        if (!data.workspace)
            throw new Error('Missing parameters.');

        const prAuthSecret = process.env.PRODUCT_ROAD_TOKEN;
        const user = await db.getUser(data.uid);

        const payload = {
            email: user.email,
            name: user.email
        };

        const token = jwt.sign(payload, prAuthSecret, { algorithm: 'HS256' });

        res.status(200).json({ token: token });
    } catch(error) {
        logger.error(error.message, { location: 'get.api.marketing.productRoadToken', error: error, data: data });
        res.status(400).send(error.message);
    }
});

router.get('/', authMiddleware, async (req, res) => {
    const data = { ...req.query, ...req.body.data };
    try {
        if (!data.workspace)
            throw new Error('Missing parameters.');

        const workspace = await db.getWorkspaceByName(data.uid, data.workspace);

        res.status(200).json({ isRemote: workspace.isRemote });
    } catch(error) {
        logger.error(error.message, { location: 'get.api.marketing', error: error, data: data });
        res.status(400).send(error.message);
    }
});

module.exports = router;
