const express = require('express');
const router = express.Router();
const workspaceAuthMiddleware = require('../middlewares/workspaceAuth');
const db = require('../lib/firebase');
const { unmanagedError } = require('../lib/errors');

/**
 * Get paginated list of OP deposits for a workspace
 * @param {number} page - The page number
 * @param {number} itemsPerPage - The number of items per page
 * @param {string} order - The order to sort by
 * @returns {Promise<Object>} - An object containing items (array of deposits) and total count
 */
router.get('/', workspaceAuthMiddleware, async (req, res, next) => {
    const data = { ...req.query, ...req.params };

    try {
        const { page, itemsPerPage, order } = data;
        const { rows: items, count: total } = await db.getWorkspaceOpDeposits(data.workspace.id, page, itemsPerPage, order);

        res.status(200).json({ items, total });
    } catch (error) {
        unmanagedError(error, req, next);
    }
});

/**
 * Get a specific OP deposit by L1 transaction hash
 * @param {string} hash - The L1 transaction hash
 * @returns {Promise<Object>} - The OP deposit
 */
router.get('/:hash', workspaceAuthMiddleware, async (req, res, next) => {
    const data = { ...req.query, ...req.params };

    try {
        const deposit = await db.getOpDepositByL1Hash(data.workspace.id, data.hash);

        res.status(200).json(deposit);
    } catch (error) {
        unmanagedError(error, req, next);
    }
});

module.exports = router;
