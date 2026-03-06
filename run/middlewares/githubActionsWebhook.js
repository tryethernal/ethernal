/**
 * @fileoverview Middleware for GitHub Actions webhook authentication.
 * Validates the shared secret in the Authorization header.
 * @module middlewares/githubActionsWebhook
 */

const logger = require('../lib/logger');

module.exports = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const expectedSecret = process.env.GITHUB_ACTIONS_WEBHOOK_SECRET;

    if (!expectedSecret) {
        logger.error('GITHUB_ACTIONS_WEBHOOK_SECRET not configured');
        return res.status(500).json({ error: 'Webhook not configured' });
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing authorization header' });
    }

    const token = authHeader.slice(7);
    if (token !== expectedSecret) {
        return res.status(401).json({ error: 'Invalid authorization token' });
    }

    next();
};
