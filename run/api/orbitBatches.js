/**
 * @fileoverview Orbit Batches API endpoints.
 * Provides L2 batch data for Arbitrum Orbit chains.
 * @module api/orbitBatches
 *
 * @route GET /:batchNumber/transactions - Get transactions in a batch
 * @route GET /:batchNumber/blocks - Get blocks in a batch
 * @route GET /:batchNumber - Get batch details
 * @route GET / - List all batches (paginated)
 */

const express = require('express');
const router = express.Router();
const workspaceAuthMiddleware = require('../middlewares/workspaceAuth');
const db = require('../lib/firebase');
const { unmanagedError } = require('../lib/errors');

/**
 * Get paginated list of transactions for a specific batch
 * @param {number} batchNumber - The batch number
 * @param {number} page - The page number
 * @param {number} itemsPerPage - The number of items per page
 * @param {string} order - The order to sort by
 * @param {string} orderBy - The field to order by
 * @returns {Promise<Array>} - A list of orbit batch transactions
 */
router.get('/:batchNumber/transactions', workspaceAuthMiddleware, async (req, res, next) => {
    const data = { ...req.query, ...req.params };

    try {
        const { total, items } = await db.getWorkspaceOrbitBatchTransactions(data.workspace.id, data.batchNumber, data.page, data.itemsPerPage, data.order, data.orderBy);

        res.status(200).json({ total, items });
    } catch (error) {
        unmanagedError(error, req, next);
    }
});

/**
 * Get paginated list of blocks for a specific batch
 * @param {number} batchNumber - The batch number
 * @param {number} page - The page number
 * @param {number} itemsPerPage - The number of items per page
 * @param {string} order - The order to sort by
 * @returns {Promise<Array>} - A list of orbit batch blocks
 */
router.get('/:batchNumber/blocks', workspaceAuthMiddleware, async (req, res, next) => {
    const data = { ...req.query, ...req.params };

    try {
        const { rows: blocks, count: total } = await db.getOrbitBatchBlocks(data.workspace.id, data.batchNumber, data.page, data.itemsPerPage, data.order);

        res.status(200).json({ total, items: blocks });
    } catch (error) {
        unmanagedError(error, req, next);
    }
});

/**
 * Get detailed information for a specific batch
 * @param {number} batchNumber - The batch number
 * @returns {Promise<Object>} - The orbit batch
 */
router.get('/:batchNumber', workspaceAuthMiddleware, async (req, res, next) => {
    const data = { ...req.query, ...req.params };

    try {
        const batch = await db.getOrbitBatch(data.workspace.id, data.batchNumber);

        res.status(200).json(batch);
    } catch (error) {
        unmanagedError(error, req, next);
    }
});

/**
 * Get paginated list of batches for a workspace
 * @param {number} page - The page number
 * @param {number} itemsPerPage - The number of items per page
 * @param {string} order - The order to sort by
 * @returns {Promise<Array>} - A list of orbit batches
 */
router.get('/', workspaceAuthMiddleware, async (req, res, next) => {
    const data = { ...req.query, ...req.params };

    try {
        const { page, itemsPerPage, order } = data;

        const { rows: items, count: total } = await db.getWorkspaceOrbitBatches(data.workspace.id, page, itemsPerPage, order);

        res.status(200).json({ items, total });
    } catch (error) {
        unmanagedError(error, req, next);
    }
});

module.exports = router;
