const express = require('express');
const workspaceAuthMiddleware = require('../middlewares/workspaceAuth');
const router = express.Router();
const db = require('../lib/firebase');
const { unmanagedError } = require('../lib/errors');

/**
     * Retrieves all transaction trace steps (internal transactions) for a workspace
     * @param {string} workspace.id - The workspace id
     * @param {number} page - The page number
     * @param {number} itemsPerPage - The number of items per page
     * @returns {Promise<Array>} An array of transaction trace steps
     * @throws {Error} If an error occurs
*/
router.get('/', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;

    try {
        const items = await db.getWorkspaceTransactionTraceSteps(data.workspace.id, data.page, data.itemsPerPage);

        res.status(200).json({ items });
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

module.exports = router;
