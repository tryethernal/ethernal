const express = require('express');
const { ethers } = require('ethers');
const router = express.Router();
const authMiddleware = require('../middlewares/auth');
const { managedError, unmanagedError } = require('../lib/errors');
const { OrbitChainConfig, OrbitTransactionState, Workspace, Transaction, Explorer, sequelize } = require('../models');
const { enqueue } = require('../lib/queue');
const OrbitTransactionProcessor = require('../lib/orbitTransactionProcessor');
const {
    orbitApiLimiter,
    orbitExpensiveLimiter,
    orbitContractValidationLimiter,
    orbitInputValidation,
    orbitSecurityHeaders,
    orbitRequestLogger
} = require('../middlewares/orbitRateLimit');

// Apply global middleware to all orbit routes
router.use(orbitSecurityHeaders);
router.use(orbitRequestLogger);
router.use(orbitApiLimiter);

/**
 * Get orbit configuration for workspace
 */
router.get('/config', authMiddleware, async (req, res, next) => {
    try {
        const { firebaseUserId: uid, workspace: workspaceName, explorerId } = req.query;

        if (!uid) {
            return managedError(new Error('Missing uid parameter'), req, res);
        }

        let workspace;
        if (explorerId) {
            // Get workspace via explorer
            const explorer = await Explorer.findByPk(explorerId, {
                include: [
                    {
                        model: Workspace,
                        as: 'workspace',
                        include: ['orbitConfig']
                    }
                ]
            });
            
            if (!explorer) {
                return managedError(new Error('Explorer not found or not accessible'), req, res);
            }
            
            workspace = explorer.workspace;
        } else if (workspaceName) {
            // Get workspace by name
            workspace = await Workspace.findOne({
                where: { userId: uid, name: workspaceName },
                include: ['orbitConfig']
            });
            
            if (!workspace) {
                return managedError(new Error('Workspace not found'), req, res);
            }
        } else {
            return managedError(new Error('Missing workspace identifier'), req, res);
        }

        res.json({ 
            orbitConfig: workspace.orbitConfig,
            isConfigured: !!workspace.orbitConfig 
        });
    } catch (error) {
        unmanagedError(error, req, next);
    }
});

/**
 * Create or update orbit configuration
 */
router.post('/config', authMiddleware, orbitInputValidation, orbitExpensiveLimiter, async (req, res, next) => {
    try {
        const { firebaseUserId: uid, workspace: workspaceName, explorerId, config } = req.body;

        if (!uid || !config) {
            return managedError(new Error('Missing required parameters'), req, res);
        }

        // Validate required configuration fields
        const requiredFields = [
            'rollupContract',
            'bridgeContract', 
            'inboxContract',
            'sequencerInboxContract',
            'outboxContract',
            'parentChainId'
        ];
        
        for (const field of requiredFields) {
            if (!config[field]) {
                return managedError(new Error(`${field} is required`), req, res);
            }
        }

        // Validate contract addresses format
        const addressRegex = /^0x[a-fA-F0-9]{40}$/;
        const addressFields = requiredFields.filter(f => f.includes('Contract'));
        
        for (const field of addressFields) {
            if (!addressRegex.test(config[field])) {
                return managedError(new Error(`${field} must be a valid Ethereum address`), req, res);
            }
        }

        // Validate optional address fields
        const optionalAddressFields = ['challengeManagerContract', 'validatorWalletCreatorContract', 'stakeToken'];
        for (const field of optionalAddressFields) {
            if (config[field] && !addressRegex.test(config[field])) {
                return managedError(new Error(`${field} must be a valid Ethereum address`), req, res);
            }
        }

        let workspace;
        if (explorerId) {
            // Get workspace via explorer
            const explorer = await Explorer.findByPk(explorerId, {
                include: [
                    {
                        model: Workspace,
                        as: 'workspace',
                        include: ['orbitConfig']
                    }
                ]
            });
            
            if (!explorer) {
                return managedError(new Error('Explorer not found or not accessible'), req, res);
            }
            
            workspace = explorer.workspace;
        } else if (workspaceName) {
            // Get workspace by name
            workspace = await Workspace.findOne({
                where: { userId: uid, name: workspaceName },
                include: ['orbitConfig']
            });
            
            if (!workspace) {
                return managedError(new Error('Workspace not found'), req, res);
            }
        } else {
            return managedError(new Error('Missing workspace identifier'), req, res);
        }

        // Create or update orbit configuration
        const orbitConfig = await workspace.updateOrbitConfig(config);
        
        // Validate contracts are accessible (optional - can be slow)
        if (req.body.validateContracts) {
            try {
                const tempTransaction = { workspace, orbitConfig };
                const processor = new OrbitTransactionProcessor(tempTransaction);
                await processor.validateContracts();
            } catch (validationError) {
                return managedError(new Error(`Contract validation failed: ${validationError.message}`), req, res);
            }
        }

        res.json({ 
            orbitConfig,
            message: 'Orbit configuration saved successfully'
        });
    } catch (error) {
        unmanagedError(error, req, next);
    }
});

/**
 * Remove orbit configuration
 */
router.delete('/config', authMiddleware, async (req, res, next) => {
    try {
        const { uid, workspace: workspaceName, explorerId } = req.query;

        if (!uid) {
            return managedError(new Error('Missing uid parameter'), req, res);
        }

        let workspace;
        if (explorerId) {
            // Get workspace via explorer
            const explorer = await Explorer.findByPk(explorerId, {
                include: [
                    {
                        model: Workspace,
                        as: 'workspace',
                        include: ['orbitConfig']
                    }
                ]
            });
            
            if (!explorer || explorer.workspace.userId != uid) {
                return managedError(new Error('Explorer not found or not accessible'), req, res);
            }
            
            workspace = explorer.workspace;
        } else if (workspaceName) {
            // Get workspace by name
            workspace = await Workspace.findOne({
                where: { userId: uid, name: workspaceName },
                include: ['orbitConfig']
            });
            
            if (!workspace) {
                return managedError(new Error('Workspace not found'), req, res);
            }
        } else {
            return managedError(new Error('Missing workspace identifier'), req, res);
        }

        await workspace.removeOrbitConfig();

        res.json({ 
            message: 'Orbit configuration removed successfully'
        });
    } catch (error) {
        unmanagedError(error, req, next);
    }
});

/**
 * Test orbit configuration
 */
router.post('/config/test', authMiddleware, orbitInputValidation, orbitContractValidationLimiter, async (req, res, next) => {
    try {
        const { firebaseUserId: uid, workspace: workspaceName, explorerId, config } = req.body;

        if (!uid) {
            return managedError(new Error('Missing uid parameter'), req, res);
        }

        let workspace;
        if (explorerId) {
            // Get workspace via explorer
            const explorer = await Explorer.findByPk(explorerId, {
                include: [
                    {
                        model: Workspace,
                        as: 'workspace'
                    }
                ]
            });
            
            if (!explorer) {
                return managedError(new Error('Explorer not found or not accessible'), req, res);
            }
            
            workspace = explorer.workspace;
        } else if (workspaceName) {
            // Get workspace by name
            workspace = await Workspace.findOne({
                where: { userId: uid, name: workspaceName }
            });
            
            if (!workspace) {
                return managedError(new Error('Workspace not found'), req, res);
            }
        } else {
            return managedError(new Error('Missing workspace identifier'), req, res);
        }

        // Use provided config or existing config

        const getParentChainProvider = () => new ethers.providers.JsonRpcProvider(config.parentChainRpcServer);
        const testConfig = { ...config, getParentChainProvider: getParentChainProvider }

        if (!testConfig) {
            return managedError(new Error('No configuration to test'), req, res);
        }
        // Create temporary processor to test configuration
        const tempTransaction = { workspace, orbitConfig: testConfig };
        const processor = new OrbitTransactionProcessor(tempTransaction);
        
        // Validate contracts
        await processor.validateContracts();
        
        // Get contract addresses for response
        const contractAddresses = processor.getContractAddresses();

        res.json({ 
            message: 'Configuration test successful',
            contractAddresses,
            testResults: {
                contractsAccessible: true,
                timestamp: new Date()
            }
        });
    } catch (error) {
        console.log('error', error);
        res.status(400).json({
            error: `Configuration test failed: ${error.message}`
        });
    }
});

/**
 * Get transaction orbit state
 */
router.get('/transaction/:hash/state', authMiddleware, async (req, res, next) => {
    try {
        const { hash } = req.params;
        const { firebaseUserId: uid, workspace: workspaceName } = req.query;

        if (!uid || !workspaceName) {
            return managedError(new Error('Missing required parameters'), req, res);
        }

        // Find workspace
        const workspace = await Workspace.findOne({
            where: { '$user.firebaseUserId$': uid, name: workspaceName },
            include: ['orbitConfig', 'user']
        });

        if (!workspace) {
            return managedError(new Error('Workspace not found'), req, res);
        }

        if (!workspace.orbitConfig) {
            return managedError(new Error('Workspace is not configured as an Orbit chain'), req, res);
        }

        // Find transaction
        const transaction = await Transaction.findOne({
            where: { 
                workspaceId: workspace.id,
                hash 
            },
            include: ['orbitState']
        });

        if (!transaction) {
            return managedError(new Error('Transaction not found'), req, res);
        }

        const orbitState = transaction.orbitState;
        
        if (!orbitState) {
            return res.json({
                found: false,
                message: 'No orbit state tracking for this transaction'
            });
        }
        
        const timeline = orbitState.getStateTimeline();
        const nextStates = orbitState.getNextStates();
        const progressPercentage = orbitState.getProgressPercentage();
        const statusDescription = orbitState.getStatusDescription();
        const estimatedTimeToCompletion = orbitState.getEstimatedTimeToCompletion();

        res.json({
            found: true,
            currentState: orbitState.currentState,
            timeline,
            nextStates,
            progressPercentage,
            statusDescription,
            estimatedTimeToCompletion,
            isFinalState: orbitState.isFinalState(),
            hasFailed: orbitState.hasFailed(),
            failureReason: orbitState.failureReason,
            stateData: orbitState.stateData,
            lastUpdated: orbitState.updatedAt
        });
    } catch (error) {
        unmanagedError(error, req, next);
    }
});

/**
 * Manually trigger orbit transaction processing
 */
router.post('/transaction/:hash/process', authMiddleware, orbitExpensiveLimiter, async (req, res, next) => {
    try {
        const { hash } = req.params;
        const { uid, workspace: workspaceName } = req.body;

        if (!uid || !workspaceName) {
            return managedError(new Error('Missing required parameters'), req, res);
        }

        // Find workspace
        const workspace = await Workspace.findOne({
            where: { userId: uid, name: workspaceName },
            include: ['orbitConfig']
        });

        if (!workspace) {
            return managedError(new Error('Workspace not found'), req, res);
        }

        if (!workspace.orbitConfig) {
            return managedError(new Error('Workspace is not configured as an Orbit chain'), req, res);
        }

        // Find transaction
        const transaction = await Transaction.findOne({
            where: { 
                workspaceId: workspace.id,
                hash 
            }
        });

        if (!transaction) {
            return managedError(new Error('Transaction not found'), req, res);
        }

        // Enqueue processing job
        await enqueue('processOrbitTransaction', `processOrbitTransaction-${transaction.id}`, {
            transactionId: transaction.id
        });

        res.json({
            message: 'Orbit transaction processing queued',
            transactionHash: hash,
            jobId: `processOrbitTransaction-${transaction.id}`
        });
    } catch (error) {
        unmanagedError(error, req, next);
    }
});

/**
 * Get orbit statistics for workspace
 */
router.get('/stats', authMiddleware, async (req, res, next) => {
    try {
        const { uid, workspace: workspaceName, explorerId } = req.query;

        if (!uid) {
            return managedError(new Error('Missing uid parameter'), req, res);
        }

        let workspace;
        if (explorerId) {
            // Get workspace via explorer
            const explorer = await Explorer.findByPk(explorerId, {
                include: [
                    {
                        model: Workspace,
                        as: 'workspace',
                        include: ['orbitConfig']
                    }
                ]
            });
            
            if (!explorer || explorer.workspace.userId != uid) {
                return managedError(new Error('Explorer not found or not accessible'), req, res);
            }
            
            workspace = explorer.workspace;
        } else if (workspaceName) {
            // Get workspace by name
            workspace = await Workspace.findOne({
                where: { userId: uid, name: workspaceName },
                include: ['orbitConfig']
            });
            
            if (!workspace) {
                return managedError(new Error('Workspace not found'), req, res);
            }
        } else {
            return managedError(new Error('Missing workspace identifier'), req, res);
        }

        if (!workspace.orbitConfig) {
            return managedError(new Error('Workspace is not configured as an Orbit chain'), req, res);
        }

        // Get orbit transaction statistics
        const stats = await OrbitTransactionState.findAll({
            where: { workspaceId: workspace.id },
            attributes: [
                'currentState',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: ['currentState'],
            raw: true
        });

        const totalTransactions = await OrbitTransactionState.count({
            where: { workspaceId: workspace.id }
        });

        const recentActivity = await OrbitTransactionState.findAll({
            where: { workspaceId: workspace.id },
            order: [['updatedAt', 'DESC']],
            limit: 10,
            include: [{
                model: Transaction,
                as: 'transaction',
                attributes: ['hash', 'timestamp']
            }]
        });

        res.json({
            isConfigured: true,
            totalTransactions,
            stateDistribution: stats,
            recentActivity: recentActivity.map(state => ({
                transactionHash: state.transaction.hash,
                currentState: state.currentState,
                lastUpdated: state.updatedAt,
                progressPercentage: state.getProgressPercentage()
            })),
            orbitConfig: workspace.orbitConfig.getSummary()
        });
    } catch (error) {
        unmanagedError(error, req, next);
    }
});

module.exports = router;
