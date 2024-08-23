const express = require('express');
const axios = require('axios');
const router = express.Router();
const logger = require('../lib/logger');
const { withTimeout } = require('../lib/utils');
const db = require('../lib/firebase');
const authMiddleware = require('../middlewares/auth');

router.delete('/:id', authMiddleware, async (req, res) => {
    const data = { ...req.query, ...req.body.data };
    try {
        if (!req.params.id)
            throw new Error('Missing parameter');

        await db.deleteExplorerDomain(data.user.id, req.params.id);

        res.sendStatus(200);
    } catch(error) {
        logger.error(error.message, { location: 'delete.domains.id', error });
        res.status(400).send(error);
    }
});

router.get('/:id', authMiddleware, async (req, res) => {
    const data = req.body.data;
    try {
        if (!req.params.id)
            throw new Error(`Missing parameters`);

        const domain = await db.getExplorerDomainById(data.user.id, req.params.id);
        if (!domain)
            throw new Error('Could not find domain');

        let dns_pointed_at, apx_hit, is_resolving, last_monitored_humanized, status, status_message, has_ssl;
        try {
            const { data: { data } } = await withTimeout(
                axios.get(`https://cloud.approximated.app/api/vhosts/by/incoming/${domain.domain}`, {
                    headers: { 'api-key': process.env.APPROXIMATED_API_KEY }
                })
            );
            ({ dns_pointed_at, apx_hit, is_resolving, last_monitored_humanized, status, status_message, has_ssl } = data);
        } catch(error) {}

        res.status(200).json({ dns_pointed_at, apx_hit, is_resolving, last_monitored_humanized, status, status_message, has_ssl });
    } catch(error) {
        logger.error(error.message, { location: 'get.api.domains.id', error, queryParams: req.params });
        res.status(400).send(error.message);
    }
});

module.exports = router;
