/**
 * @fileoverview Basic Auth middleware for Sentry Dashboard.
 * Validates Authorization: Basic header against env vars.
 * @module middlewares/sentryDashboardAuth
 */

const { timingSafeEqual } = require('crypto');
const logger = require('../lib/logger');

const safeEqual = (a, b) => {
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));
    return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
};

module.exports = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Basic ')) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Sentry Dashboard"');
        return res.status(401).send('Authentication required');
    }

    try {
        const base64Credentials = authHeader.split(' ')[1];
        const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
        const colonIndex = credentials.indexOf(':');
        const username = credentials.slice(0, colonIndex);
        const password = credentials.slice(colonIndex + 1);

        const expectedUsername = process.env.SENTRY_DASHBOARD_USERNAME;
        const expectedPassword = process.env.SENTRY_DASHBOARD_PASSWORD;

        if (!expectedUsername || !expectedPassword) {
            logger.error('SENTRY_DASHBOARD_USERNAME or SENTRY_DASHBOARD_PASSWORD not configured', { location: 'middleware.sentryDashboardAuth' });
            return res.status(500).send('Server misconfigured');
        }

        if (safeEqual(username, expectedUsername) && safeEqual(password, expectedPassword)) {
            return next();
        }

        res.setHeader('WWW-Authenticate', 'Basic realm="Sentry Dashboard"');
        return res.status(401).send('Invalid credentials');
    } catch (error) {
        logger.error(error.message, { location: 'middleware.sentryDashboardAuth', error });
        res.setHeader('WWW-Authenticate', 'Basic realm="Sentry Dashboard"');
        return res.status(401).send('Invalid credentials');
    }
};
