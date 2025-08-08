const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth');
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
 * Get paginated list of batches for a workspace
 */
router.get('/batches', authMiddleware, async (req, res, next) => {
    try {
        const { 
            firebaseUserId: uid, 
            workspace: workspaceName, 
            explorerId,
            page = 1,
            limit = 50,
            status,
            fromDate,
            toDate,
            sortBy = 'batchSequenceNumber',
            sortOrder = 'DESC'
        } = req.query;

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

        const options = {
            page: parseInt(page),
            limit: Math.min(parseInt(limit), 100), // Cap at 100
            sortBy,
            sortOrder
        };

        if (status) {
            options.status = status;
        }

        if (fromDate) {
            options.fromDate = new Date(fromDate);
        }

        if (toDate) {
            options.toDate = new Date(toDate);
        }

        const result = await OrbitBatch.findBatchesWithPagination(workspace.id, options);

        res.json({
            ...result,
            workspace: {
                id: workspace.id,
                name: workspace.name
            }
        });

    } catch (error) {
        unmanagedError(error, req, res);
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