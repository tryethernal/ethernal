const express = require('express');
const router = express.Router();
const workspaceAuthMiddleware = require('../middlewares/workspaceAuth');
const db = require('../lib/firebase');
const { unmanagedError, managedError } = require('../lib/errors');

/**
 * Sanitize pagination parameters
 */
const sanitizePagination = (page, itemsPerPage, order) => ({
    page: Math.max(1, parseInt(page) || 1),
    itemsPerPage: Math.min(100, Math.max(1, parseInt(itemsPerPage) || 10)),
    order: ['ASC', 'DESC'].includes(order?.toUpperCase()) ? order.toUpperCase() : 'DESC'
});

/**
 * Get paginated list of OP batches for a workspace
 * @param {number} page - The page number
 * @param {number} itemsPerPage - The number of items per page
 * @param {string} order - The order to sort by
 * @returns {Promise<Array>} - A list of OP batches
 */
router.get('/', workspaceAuthMiddleware, async (req, res, next) => {
    const data = { ...req.query, ...req.params };

    try {
        const { page, itemsPerPage, order } = sanitizePagination(data.page, data.itemsPerPage, data.order);
        const { rows: items, count: total } = await db.getWorkspaceOpBatches(data.workspace.id, page, itemsPerPage, order);

        res.status(200).json({ items, total });
    } catch (error) {
        unmanagedError(error, req, next);
    }
});

/**
 * Get detailed information for a specific OP batch
 * @param {number} batchIndex - The batch index
 * @returns {Promise<Object>} - The OP batch
 */
router.get('/:batchIndex', workspaceAuthMiddleware, async (req, res, next) => {
    const data = { ...req.query, ...req.params };

    try {
        const batch = await db.getOpBatch(data.workspace.id, data.batchIndex);

        if (!batch) {
            return res.status(404).json({ error: 'Batch not found' });
        }

        res.status(200).json(batch);
    } catch (error) {
        unmanagedError(error, req, next);
    }
});

/**
 * Get paginated list of L2 transactions for a specific OP batch
 * @param {number} batchIndex - The batch index
 * @param {number} page - The page number
 * @param {number} itemsPerPage - The number of items per page
 * @param {string} order - The order to sort by
 * @returns {Promise<Array>} - A list of L2 transactions in the batch
 */
router.get('/:batchIndex/transactions', workspaceAuthMiddleware, async (req, res, next) => {
    const data = { ...req.query, ...req.params };

    try {
        const { page, itemsPerPage, order } = sanitizePagination(data.page, data.itemsPerPage, data.order);
        const { total, items } = await db.getOpBatchTransactions(data.workspace.id, data.batchIndex, page, itemsPerPage, order);

        res.status(200).json({ total, items });
    } catch (error) {
        unmanagedError(error, req, next);
    }
});

module.exports = router;
