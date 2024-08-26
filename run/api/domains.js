const express = require('express');
const axios = require('axios');
const router = express.Router();
const { withTimeout } = require('../lib/utils');
const db = require('../lib/firebase');
const authMiddleware = require('../middlewares/auth');
const { managedError, unmanagedError } = require('../lib/errors');

router.delete('/:id', authMiddleware, async (req, res, next) => {
    const data = { ...req.query, ...req.body.data };
    try {
        if (!req.params.id)
            return managedError(new Error('Missing parameter'), req, res);

        await db.deleteExplorerDomain(data.user.id, req.params.id);

        res.sendStatus(200);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/:id', authMiddleware, async (req, res, next) => {
    const data = req.body.data;
    try {
        if (!req.params.id)
            return managedError(new Error(`Missing parameters`), req, res);

        const domain = await db.getExplorerDomainById(data.user.id, req.params.id);
        if (!domain)
            return managedError(new Error('Could not find domain'), req, res);

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
        unmanagedError(error, req, next);
    }
});

module.exports = router;
