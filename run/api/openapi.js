/**
 * @fileoverview Serves the OpenAPI document of the public explorer API.
 * The YAML source (lib/openapi/openapi.yaml) is parsed once at boot. When the request
 * is addressed to an explorer's own host, `servers` and `info.title` are personalised.
 * @module api/openapi
 *
 * @route GET / - OpenAPI 3.1 document as JSON (mounted at /api/openapi.json)
 */

const fs = require('fs');
const path = require('path');
const express = require('express');
const yaml = require('js-yaml');
const router = express.Router();
const logger = require('../lib/logger');
const { normaliseHost, resolvePublicExplorer, loadPublicWorkspace } = require('../lib/publicExplorer');

const CACHE_CONTROL = 'public, max-age=300';

/**
 * Parsed OpenAPI document, or null if it could not be loaded.
 * @type {Object|null}
 */
let openApiDocument = null;
try {
    openApiDocument = yaml.load(fs.readFileSync(path.join(__dirname, '../lib/openapi/openapi.yaml'), 'utf8'));
} catch (error) {
    logger.error(error.message, { location: 'api.openapi.load', error });
}

router.get('/', async (req, res) => {
    if (!openApiDocument)
        return res.status(500).send('OpenAPI document unavailable');

    let document = openApiDocument;
    try {
        const resolved = await resolvePublicExplorer(req);
        if (resolved && resolved.via === 'host' && await loadPublicWorkspace(resolved)) {
            document = {
                ...openApiDocument,
                info: { ...openApiDocument.info, title: `${resolved.explorerName} API` },
                servers: [{ url: `https://${normaliseHost(req)}/api` }]
            };
        }
    } catch (error) {
        logger.warn('Could not personalise the OpenAPI document', { location: 'api.openapi', error: error.message });
    }

    res.set('Cache-Control', CACHE_CONTROL);
    res.set('Vary', 'Host, X-Forwarded-Host');
    res.status(200).json(document);
});

module.exports = router;
