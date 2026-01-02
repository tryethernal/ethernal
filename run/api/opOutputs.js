const express = require('express');
const router = express.Router();
const workspaceAuthMiddleware = require('../middlewares/workspaceAuth');
const db = require('../lib/firebase');
const { unmanagedError, managedError } = require('../lib/errors');
const { sanitizePagination } = require('../lib/utils');

/**
 * Get paginated list of OP outputs for a workspace
 * @param {number} page - The page number
 * @param {number} itemsPerPage - The number of items per page
 * @param {string} order - The order to sort by
 * @returns {Promise<Array>} - A list of OP outputs
 */
router.get('/', workspaceAuthMiddleware, async (req, res, next) => {
    const data = { ...req.query, ...req.params };

    try {
        const { page, itemsPerPage, order } = sanitizePagination(data.page, data.itemsPerPage, data.order);
        const { rows: items, count: total } = await db.getWorkspaceOpOutputs(data.workspace.id, page, itemsPerPage, order);

        res.status(200).json({ items, total });
    } catch (error) {
        unmanagedError(error, req, next);
    }
});

/**
 * Get detailed information for a specific OP output
 * @param {number} outputIndex - The output index
 * @returns {Promise<Object>} - The OP output
 */
router.get('/:outputIndex', workspaceAuthMiddleware, async (req, res, next) => {
    const data = { ...req.query, ...req.params };

    try {
        const output = await db.getOpOutput(data.workspace.id, data.outputIndex);

        if (!output) {
            return res.status(404).json({ error: 'Output not found' });
        }

        res.status(200).json(output);
    } catch (error) {
        unmanagedError(error, req, next);
    }
});

module.exports = router;
