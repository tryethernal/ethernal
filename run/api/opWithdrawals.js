const express = require('express');
const router = express.Router();
const workspaceAuthMiddleware = require('../middlewares/workspaceAuth');
const db = require('../lib/firebase');
const { unmanagedError, managedError } = require('../lib/errors');
const { sanitizePagination } = require('../lib/utils');

/**
 * Get paginated list of OP withdrawals for a workspace
 * @param {number} page - The page number
 * @param {number} itemsPerPage - The number of items per page
 * @param {string} order - The order to sort by
 * @returns {Promise<Array>} - A list of OP withdrawals
 */
router.get('/', workspaceAuthMiddleware, async (req, res, next) => {
    const data = { ...req.query, ...req.params };

    try {
        const { page, itemsPerPage, order } = sanitizePagination(data.page, data.itemsPerPage, data.order);
        const { rows: items, count: total } = await db.getWorkspaceOpWithdrawals(data.workspace.id, page, itemsPerPage, order);

        res.status(200).json({ items, total });
    } catch (error) {
        unmanagedError(error, req, next);
    }
});

/**
 * Get a specific OP withdrawal by L2 transaction hash
 * @param {string} hash - The L2 transaction hash
 * @returns {Promise<Object>} - The OP withdrawal
 */
router.get('/:hash', workspaceAuthMiddleware, async (req, res, next) => {
    const data = { ...req.query, ...req.params };

    try {
        const withdrawal = await db.getOpWithdrawalByL2Hash(data.workspace.id, data.hash);

        if (!withdrawal) {
            return res.status(404).json({ error: 'Withdrawal not found' });
        }

        res.status(200).json(withdrawal);
    } catch (error) {
        unmanagedError(error, req, next);
    }
});

/**
 * Get proof data for an OP withdrawal (for claiming on L1)
 * @param {string} hash - The L2 transaction hash
 * @returns {Promise<Object>} - The withdrawal proof data
 */
router.get('/:hash/proof', workspaceAuthMiddleware, async (req, res, next) => {
    const data = { ...req.query, ...req.params };

    try {
        const proof = await db.getOpWithdrawalProof(data.workspace.id, data.hash);

        if (!proof) {
            return res.status(404).json({ error: 'Withdrawal proof not found' });
        }

        res.status(200).json(proof);
    } catch (error) {
        unmanagedError(error, req, next);
    }
});

module.exports = router;
