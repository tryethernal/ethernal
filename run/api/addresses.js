const express = require('express');
const router = express.Router();
const db = require('../lib/firebase');
const { ProviderConnector } = require('../lib/rpc');
const workspaceAuthMiddleware = require('../middlewares/workspaceAuth');
const { managedError, unmanagedError } = require('../lib/errors');

/*
    Returns the number of token transfers for an address in a given time range.

    @param {string} address (mandatory) - The address to get the token transfer history for
    @param {string} from (mandatory) - The start date
    @param {string} to (mandatory) - The end date
    @returns {Array} - The number of token transfers for the address in the given time range
*/
router.get('/:address/tokenTransferHistory', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;

    try {
        if (!req.params.address || !data.from || !data.to)
            return managedError(new Error('Missing parameter'), req, res);

        const result = await db.getAddressTokenTransferHistory(data.workspace.id, req.params.address, data.from, data.to);

        res.status(200).json(result);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

/*
    Returns the amount of transaction fees spent by an address in a given time range.

    @param {string} address (mandatory) - The address to get the transaction fees for
    @param {string} from (mandatory) - The start date
    @param {string} to (mandatory) - The end date
    @returns {Array} - The amount of transaction fees spent by the address in the given time range
*/
router.get('/:address/spentTransactionFeeHistory', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;

    try {
        if (!req.params.address || !data.from || !data.to)
            return managedError(new Error('Missing parameter'), req, res);

        const result = await db.getAddressSpentTransactionFeeHistory(data.workspace.id, req.params.address, data.from, data.to);

        res.status(200).json(result);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

/*
    Returns the number of transactions for an address in a given time range.

    @param {string} address (mandatory) - The address to get the number of transactions for
    @param {string} from (mandatory) - The start date
    @param {string} to (mandatory) - The end date
    @returns {Array} - The number of transactions for the address in the given time range
*/
router.get('/:address/transactionHistory', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;

    try {
        if (!req.params.address || !data.from || !data.to)
            return managedError(new Error('Missing parameter'), req, res);

        const result = await db.getAddressTransactionHistory(data.workspace.id, req.params.address, data.from, data.to);

        res.status(200).json(result);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

/*
    Returns all internal transactions involving the specified address.

    @param {string} address (mandatory) - The address to get the internal transactions for
    @param {number} page (optional) - The page number
    @param {number} itemsPerPage (optional) - The number of items per page
*/
router.get('/:address/internalTransactions', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;

    try {
        if (!req.params.address)
            return managedError(new Error('[GET /:address/internalTransactions] Missing parameter'), req, res);

        const items = await db.getAddressTransactionTraceSteps(data.workspace.id, req.params.address, data.page, data.itemsPerPage);

        res.status(200).json({ items });
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/:address/tokenTransfers', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;

    try {
        if (!req.params.address)
            return managedError(new Error('[GET /:address/tokenTransfers] Missing parameter'), req, res);

        const result = await db.getAddressTokenTransfers(data.workspace.id, req.params.address, data.page, data.itemsPerPage, data.orderBy, data.order, data.tokenTypes);

        res.status(200).json(result);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/:address/stats', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;

    try {
        if (!req.params.address)
            return managedError(new Error('[GET /:address/stats] Missing parameter'), req, res);

        const stats = await db.getAddressTransactionStats(data.workspace.id, req.params.address);

        res.status(200).json(stats);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/:address/nativeTokenBalance', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;

    try {
        const provider = new ProviderConnector(data.workspace.rpcServer);

        let balance;
        try {
            balance = await provider.getBalance(req.params.address);
        } catch(error) {
            balance = null;
        }

        res.status(200).json({ balance: balance ? balance.toString() : null });
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/:address/balances', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;

    try {
        if (!req.params.address)
            return managedError(new Error('[GET /:address/balances] Missing parameter'), req, res);

        const result = await db.getAddressLatestTokenBalances(data.workspace.id, req.params.address, req.query.patterns);

        res.status(200).json(result);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/:address/transactions', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;

    try {
        const result = await db.getAddressTransactions(data.workspace.id, req.params.address, data.page, data.itemsPerPage, data.order, data.sortBy);

        res.status(200).json(result);
    } catch(error) {
        unmanagedError(error, req, next);
    }
})

module.exports = router;
