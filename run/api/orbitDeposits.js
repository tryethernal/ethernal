const express = require('express');
const router = express.Router();
const workspaceAuthMiddleware = require('../middlewares/workspaceAuth');
const db = require('../lib/firebase');
const { unmanagedError } = require('../lib/errors');

/**
 * Get paginated list of orbit deposits for a workspace
 * @param {number} page - The page number
 * @param {number} itemsPerPage - The number of items per page
 * @param {string} order - The order to sort by
 * @returns {Promise<Array>} - A list of orbit deposits
 */
router.get('/', workspaceAuthMiddleware, async (req, res, next) => {
    const data = { ...req.query, ...req.params };

    try {
        const { page, itemsPerPage, order } = data;

        const { rows: items, count: total } = await db.getWorkspaceOrbitDeposits(data.workspace.id, page, itemsPerPage, order);

        res.status(200).json({ items, total });
    } catch (error) {
        unmanagedError(error, req, next);
    }
});

module.exports = router;
