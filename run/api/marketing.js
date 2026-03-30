/**
 * @fileoverview Marketing API endpoints.
 * Handles user feedback and product roadmap integration.
 * @module api/marketing
 *
 * @route POST /feedback - Submit user feedback to Discord
 * @route GET /productRoadToken - Get ProductRoad SSO token
 * @route GET / - Get workspace remote status
 */

const jwt = require('jsonwebtoken');
const axios = require('axios');
const Mailjet = require('node-mailjet');
const express = require('express');
const router = express.Router();
const db = require('../lib/firebase');
const { enqueue } = require('../lib/queue');
const { getDiscordFeedbackChannelWebhook, getProductRoadToken, getMailjetPublicKey, getMailjetPrivateKey, getMailjetNewsletterListId } = require('../lib/env');
const { isMailjetEnabled } = require('../lib/flags');
const authMiddleware = require('../middlewares/auth');
const { managedError, unmanagedError } = require('../lib/errors');

const newsletterAttempts = new Map();
function newsletterLimiter(req, res, next) {
    const ip = req.ip;
    const now = Date.now();
    const window = 15 * 60 * 1000;
    const entry = newsletterAttempts.get(ip);
    if (entry && now - entry.start < window) {
        if (entry.count >= 5) return res.status(429).json({ error: 'Too many requests' });
        entry.count++;
    } else {
        newsletterAttempts.set(ip, { start: now, count: 1 });
    }
    next();
}

/**
 * @route POST /newsletter - Subscribe an email to the blog newsletter
 * @param {string} req.body.email - Email address to subscribe
 * @returns {200} Success (idempotent, returns 200 even if already subscribed)
 * @returns {400} Missing or invalid email
 * @returns {503} Mailjet not configured
 */
router.post('/newsletter', newsletterLimiter, async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
            return managedError(new Error('Valid email required.'), req, res);

        if (!isMailjetEnabled() || !getMailjetNewsletterListId())
            return res.status(503).json({ error: 'Newsletter not configured' });

        const mailjet = Mailjet.apiConnect(getMailjetPublicKey(), getMailjetPrivateKey());

        // Create or update contact (Mailjet returns 400 with MJ-0013 if contact exists)
        await mailjet.post('contact', { version: 'v3' })
            .request({ IsExcludedFromCampaigns: false, Email: email })
            .catch(err => {
                if (err.statusCode !== 400) throw err;
            });

        // Add contact to newsletter list (Mailjet returns 400 if already on list)
        await mailjet.post('listrecipient', { version: 'v3' })
            .request({ ContactAlt: email, ListID: getMailjetNewsletterListId(), IsUnsubscribed: false })
            .catch(err => {
                if (err.statusCode !== 400) throw err;
            });

        res.status(200).json({ success: true });
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

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

        const workspace = await db.getWorkspaceByNameAuth(data.uid, data.workspace);

        res.status(200).json({ isRemote: workspace.isRemote });
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

module.exports = router;
