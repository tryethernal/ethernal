const express = require('express');
const router = express.Router();
const db = require('../lib/firebase');
const logger = require('../lib//logger');
const workspaceAuthMiddleware = require('../middlewares/workspaceAuth');

router.get('/:address/balances', workspaceAuthMiddleware, async (req, res) => {
    const data = req.query;

    try {
        if (!req.params.address)
            throw new Error('[GET /:address/balances] Missing parameter');

        const result = await db.getAddressLatestTokenBalances(data.workspace.id, req.params.address, req.query.patterns);

        res.status(200).json(result);
    } catch(error) {
        logger.error(error.message, { location: 'api.addresses.address.balance', error: error, data: data, queryParams: req.params });
        res.status(400).send(error);
    }
});

router.get('/:address/transactions', workspaceAuthMiddleware, async (req, res) => {
    const data = req.query;

    try {
        const result = await db.getAddressTransactions(data.workspace.id, req.params.address, data.page, data.itemsPerPage, data.order, data.sortBy);

        res.status(200).json(result);
    } catch(error) {
        logger.error(error.message, { location: 'api.addresses.address.transaction', error: error, data: data, queryParams: req.params });
        res.status(400).send(error);
    }
})

module.exports = router;
