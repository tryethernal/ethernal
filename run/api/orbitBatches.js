const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth');
const workspaceAuthMiddleware = require('../middlewares/workspaceAuth');
const db = require('../lib/firebase');
const { managedError, unmanagedError } = require('../lib/errors');
const { OrbitBatch, OrbitTransactionState, Workspace, Explorer, sequelize } = require('../models');
const {
    orbitApiLimiter,
    orbitSecurityHeaders,
    orbitRequestLogger
} = require('../middlewares/orbitRateLimit');

// Apply global middleware to all batch routes
router.use(orbitSecurityHeaders);
router.use(orbitRequestLogger);
router.use(orbitApiLimiter);

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
        unmanagedError(error, req, res);
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
        unmanagedError(error, req, res);
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
        unmanagedError(error, req, res);
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

/**
 * Get detailed information for a specific batch
 */
router.get('/batch/:batchNumber', authMiddleware, async (req, res, next) => {
    try {
        const { batchNumber } = req.params;
        const { firebaseUserId: uid, workspace: workspaceName, explorerId } = req.query;

        if (!uid) {
            return managedError(new Error('Missing uid parameter'), req, res);
        }

        let workspace;
        
        if (workspaceName) {
            workspace = await Workspace.findOne({
                where: { name: workspaceName },
                include: [{
                    model: require('../models').User,
                    as: 'user',
                    where: { firebaseUserId: uid }
                }]
            });
        } else if (explorerId) {
            const explorer = await Explorer.findByPk(explorerId, {
                include: [{
                    model: Workspace,
                    as: 'workspace',
                    include: [{
                        model: require('../models').User,
                        as: 'user',
                        where: { firebaseUserId: uid }
                    }]
                }]
            });
            workspace = explorer?.workspace;
        }

        if (!workspace) {
            return managedError(new Error('Workspace not found'), req, res);
        }

        const batch = await OrbitBatch.findOne({
            where: {
                workspaceId: workspace.id,
                batchSequenceNumber: batchNumber
            },
            include: [{
                model: Workspace,
                as: 'workspace',
                attributes: ['id', 'name']
            }]
        });

        if (!batch) {
            return res.status(404).json({
                error: 'Batch not found',
                batchNumber
            });
        }

        // Get transaction states for this batch
        const transactionStates = await OrbitTransactionState.findAll({
            where: {
                workspaceId: workspace.id,
                'stateData.sequenced.batchSequenceNumber': batchNumber.toString()
            },
            include: [{
                model: require('../models').Transaction,
                as: 'transaction',
                attributes: ['id', 'hash', 'from', 'to', 'value', 'blockNumber']
            }],
            order: [['sequencedAt', 'ASC']],
            limit: 1000 // Reasonable limit for batch transactions
        });

        const detailedInfo = batch.getDetailedInfo();
        
        res.json({
            ...detailedInfo,
            workspace: {
                id: workspace.id,
                name: workspace.name
            },
            transactions: transactionStates.map(state => ({
                hash: state.transaction.hash,
                from: state.transaction.from,
                to: state.transaction.to,
                value: state.transaction.value,
                blockNumber: state.transaction.blockNumber,
                currentState: state.currentState,
                sequencedAt: state.sequencedAt
            }))
        });

    } catch (error) {
        unmanagedError(error, req, res);
    }
});

/**
 * Get batch statistics for a workspace
 */
router.get('/stats', authMiddleware, async (req, res, next) => {
    try {
        const { firebaseUserId: uid, workspace: workspaceName, explorerId, days = 30 } = req.query;

        if (!uid) {
            return managedError(new Error('Missing uid parameter'), req, res);
        }

        let workspace;
        
        if (workspaceName) {
            workspace = await Workspace.findOne({
                where: { name: workspaceName },
                include: [{
                    model: require('../models').User,
                    as: 'user',
                    where: { firebaseUserId: uid }
                }]
            });
        } else if (explorerId) {
            const explorer = await Explorer.findByPk(explorerId, {
                include: [{
                    model: Workspace,
                    as: 'workspace',
                    include: [{
                        model: require('../models').User,
                        as: 'user',
                        where: { firebaseUserId: uid }
                    }]
                }]
            });
            workspace = explorer?.workspace;
        }

        if (!workspace) {
            return managedError(new Error('Workspace not found'), req, res);
        }

        const statistics = await OrbitBatch.getBatchStatistics(workspace.id, parseInt(days));

        // Get recent batches for overview
        const recentBatches = await OrbitBatch.findAll({
            where: { workspaceId: workspace.id },
            order: [['batchSequenceNumber', 'DESC']],
            limit: 10,
            attributes: [
                'batchSequenceNumber', 
                'confirmationStatus', 
                'transactionCount', 
                'postedAt',
                'parentChainTxHash'
            ]
        });

        res.json({
            workspace: {
                id: workspace.id,
                name: workspace.name
            },
            statistics,
            recentBatches: recentBatches.map(batch => batch.getSummary())
        });

    } catch (error) {
        unmanagedError(error, req, res);
    }
});

/**
 * Search batches by transaction hash
 */
router.get('/search', authMiddleware, async (req, res, next) => {
    try {
        const { firebaseUserId: uid, workspace: workspaceName, explorerId, txHash } = req.query;

        if (!uid) {
            return managedError(new Error('Missing uid parameter'), req, res);
        }

        if (!txHash) {
            return managedError(new Error('Missing txHash parameter'), req, res);
        }

        let workspace;
        
        if (workspaceName) {
            workspace = await Workspace.findOne({
                where: { name: workspaceName },
                include: [{
                    model: require('../models').User,
                    as: 'user',
                    where: { firebaseUserId: uid }
                }]
            });
        } else if (explorerId) {
            const explorer = await Explorer.findByPk(explorerId, {
                include: [{
                    model: Workspace,
                    as: 'workspace',
                    include: [{
                        model: require('../models').User,
                        as: 'user',
                        where: { firebaseUserId: uid }
                    }]
                }]
            });
            workspace = explorer?.workspace;
        }

        if (!workspace) {
            return managedError(new Error('Workspace not found'), req, res);
        }

        // Find transaction state for this hash
        const transactionState = await OrbitTransactionState.findOne({
            where: {
                workspaceId: workspace.id
            },
            include: [{
                model: require('../models').Transaction,
                as: 'transaction',
                where: { hash: txHash },
                attributes: ['id', 'hash', 'from', 'to', 'value', 'blockNumber']
            }]
        });

        if (!transactionState) {
            return res.status(404).json({
                error: 'Transaction not found in orbit states',
                txHash
            });
        }

        // Get batch sequence number from state data
        const batchSequenceNumber = transactionState.stateData?.sequenced?.batchSequenceNumber;
        
        if (!batchSequenceNumber) {
            return res.json({
                transaction: {
                    hash: transactionState.transaction.hash,
                    currentState: transactionState.currentState,
                    batchSequenceNumber: null
                },
                batch: null,
                message: 'Transaction not yet sequenced in a batch'
            });
        }

        // Find the batch
        const batch = await OrbitBatch.findOne({
            where: {
                workspaceId: workspace.id,
                batchSequenceNumber: batchSequenceNumber
            }
        });

        res.json({
            transaction: {
                hash: transactionState.transaction.hash,
                from: transactionState.transaction.from,
                to: transactionState.transaction.to,
                value: transactionState.transaction.value,
                blockNumber: transactionState.transaction.blockNumber,
                currentState: transactionState.currentState,
                batchSequenceNumber: batchSequenceNumber
            },
            batch: batch ? batch.getSummary() : null
        });

    } catch (error) {
        unmanagedError(error, req, res);
    }
});

module.exports = router;