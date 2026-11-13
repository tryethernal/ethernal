/**
 * @fileoverview Caddy reverse proxy API endpoints.
 * Used by Caddy for on-demand TLS certificate provisioning.
 * @module api/caddy
 *
 * @route GET /validDomain - Check if domain should get SSL certificate
 */

const express = require('express');
const router = express.Router();
const db = require('../lib/firebase');
const { getAppDomain } = require('../lib/env');
const { unmanagedError } = require('../lib/errors');

/**
 * Checks if a hostname is the app domain itself or exactly one label below it
 * (e.g. `example.com` or `foo.example.com`, but not `a.b.example.com` nor
 * `eviltryethernal.com`). Case-insensitive, tolerates a trailing dot.
 * @param {string} domain - The hostname Caddy asks about
 * @param {string} [appDomain] - The configured app domain (e.g. `tryethernal.com`)
 * @returns {boolean} - True if the hostname is the app domain or a direct subdomain of it
 */
const isAppDomainOrDirectSubdomain = (domain, appDomain) => {
    if (!appDomain || typeof domain !== 'string')
        return false;

    /**
     * @param {string} host - Hostname to normalize
     * @returns {string} Trimmed, lowercased hostname without a trailing dot
     */
    const normalize = (host) => host.trim().toLowerCase().replace(/\.$/, '');
    const host = normalize(domain);
    const root = normalize(appDomain);
    if (!root)
        return false;

    if (host === root)
        return true;

    const suffix = `.${root}`;
    if (!host.endsWith(suffix))
        return false;

    const label = host.slice(0, -suffix.length);
    return label.length > 0 && !label.includes('.');
};

/**
 * Checks if a domain has been registered.
 * This endpoint is used by Caddy to check if it should issue a SSL certificate.
 * @param {string} domain - The domain to check
 * @returns {Promise<boolean>} - True if the domain is registered, false otherwise
 */
router.get('/validDomain', async (req, res, next) => {
    try {
        const { domain } = req.query;
        if (!domain)
            throw new Error('Missing domain');

        // Main domain & its direct subdomains are always valid (deeper levels and lookalikes are not)
        if (isAppDomainOrDirectSubdomain(domain, getAppDomain()))
            return res.sendStatus(200);

        const isValid = await db.isValidExplorerDomain(domain);

        return isValid ? res.sendStatus(200) : res.sendStatus(400);
    } catch (error) {
        unmanagedError(error, req, next);
    }
});

module.exports = router;
