/**
 * @fileoverview Basic Auth middleware for Sentry Dashboard.
 * Validates Authorization: Basic header against env vars.
 * @module middlewares/sentryDashboardAuth
 */

const logger = require('../lib/logger');

module.exports = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Basic ')) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Sentry Dashboard"');
        return res.status(401).send('Authentication required');
    }

    try {
        const base64Credentials = authHeader.split(' ')[1];
        const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
        const [username, password] = credentials.split(':');

        const expectedUsername = process.env.SENTRY_DASHBOARD_USERNAME;
        const expectedPassword = process.env.SENTRY_DASHBOARD_PASSWORD;

        if (!expectedUsername || !expectedPassword) {
            logger.error('SENTRY_DASHBOARD_USERNAME or SENTRY_DASHBOARD_PASSWORD not configured', { location: 'middleware.sentryDashboardAuth' });
            return res.status(500).send('Server misconfigured');
        }

        if (username === expectedUsername && password === expectedPassword) {
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
