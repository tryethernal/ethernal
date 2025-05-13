const express = require('express');
const router = express.Router();
const db = require('../lib/firebase');
const selfHostedMiddleware = require('../middlewares/selfHosted');
const { getAppDomain } = require('../lib/env');
const { unmanagedError } = require('../lib/errors');

/**
 * Checks if a domain has been registered.
 * This endpoint is used by Caddy to check if it should issue a SSL certificate.
 * @param {string} domain - The domain to check
 * @returns {Promise<boolean>} - True if the domain is registered, false otherwise
 */
router.get('/validDomain', selfHostedMiddleware, async (req, res, next) => {
    try {
        const { domain } = req.query;
        if (!domain)
            throw new Error('Missing domain');

        // Main domain & subdomains are always valid
        if (domain.endsWith(getAppDomain()))
            return res.sendStatus(200);

        const isValid = await db.isValidExplorerDomain(domain);

        return isValid ? res.sendStatus(200) : res.sendStatus(400);
    } catch (error) {
        unmanagedError(error, req, next);
    }
});

module.exports = router;
