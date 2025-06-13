const jwt = require('jsonwebtoken');
const axios = require('axios');
const express = require('express');
const router = express.Router();
const db = require('../lib/firebase');
const { enqueue } = require('../lib/queue');
const { getDiscordFeedbackChannelWebhook, getProductRoadToken } = require('../lib/env');
const authMiddleware = require('../middlewares/auth');
const { managedError, unmanagedError } = require('../lib/errors');

router.post('/feedback', async (req, res, next) => {
    const data = req.body;
    try {
        const content = `
            **New ${data.feedbackType} from ${data.email}**

${data.message}
        `;

        await enqueue('sendDiscordMessage', `sendDiscordMessage-${Date.now()}`, { content, channel: getDiscordFeedbackChannelWebhook() });

        res.sendStatus(200);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/productRoadToken', authMiddleware, async (req, res, next) => {
    const data = { ...req.query, ...req.body.data };
    try {
        if (!getProductRoadToken())
            return res.status(200).json({ token: null });

        if (!data.workspace)
            return managedError(new Error('Missing parameters.'), req, res);

        const prAuthSecret = getProductRoadToken();
        const user = await db.getUser(data.uid);

        const payload = {
            email: user.email,
            name: user.email
        };

        const token = jwt.sign(payload, prAuthSecret, { algorithm: 'HS256' });

        res.status(200).json({ token: token });
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/', authMiddleware, async (req, res, next) => {
    const data = { ...req.query, ...req.body.data };
    try {
        if (!data.workspace)
            return managedError(new Error('Missing parameters.'), req, res);

        const workspace = await db.getWorkspaceByName(data.uid, data.workspace);

        res.status(200).json({ isRemote: workspace.isRemote });
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

module.exports = router;
