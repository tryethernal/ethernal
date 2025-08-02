const express = require('express');
const router = express.Router();
const { getOrbitConfig } = require('../lib/orbitConfig');
const { OrbitChainConfig, OrbitTransactionState, Workspace, sequelize } = require('../models');
const { getQueue } = require('../lib/queue');
const logger = require('../lib/logger');
const { ProductionRpcClient } = require('../lib/orbitRetry');

const config = getOrbitConfig();

/**
 * Overall health check for orbit functionality
 */
router.get('/health', async (req, res) => {
    const startTime = Date.now();
    const healthCheck = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || 'unknown',
        uptime: process.uptime(),
        checks: {}
    };

    try {
        // Database connectivity check
        try {
            await sequelize.authenticate();
            await OrbitChainConfig.count();
            healthCheck.checks.database = { status: 'healthy', latency: Date.now() - startTime };
        } catch (error) {
            healthCheck.checks.database = { status: 'unhealthy', error: error.message };
            healthCheck.status = 'unhealthy';
        }

        // Queue system check
        try {
            const queue = getQueue('medium_priority');
            const queueHealth = await queue.getJobCounts();
            healthCheck.checks.queue = { 
                status: 'healthy', 
                waiting: queueHealth.waiting,
                active: queueHealth.active,
                completed: queueHealth.completed,
                failed: queueHealth.failed
            };
        } catch (error) {
            healthCheck.checks.queue = { status: 'unhealthy', error: error.message };
            healthCheck.status = 'unhealthy';
        }

        // Configuration check
        try {
            config.validate();
            healthCheck.checks.configuration = { status: 'healthy' };
        } catch (error) {
            healthCheck.checks.configuration = { status: 'unhealthy', error: error.message };
            healthCheck.status = 'unhealthy';
        }

        // Sample workspace orbit configs check
        try {
            const orbitConfigCount = await OrbitChainConfig.count();
            const activeStatesCount = await OrbitTransactionState.count({
                where: {
                    currentState: ['SUBMITTED', 'SEQUENCED', 'POSTED', 'CONFIRMED']
                }
            });
            
            healthCheck.checks.orbitConfigs = {
                status: 'healthy',
                totalConfigurations: orbitConfigCount,
                activeTransactionStates: activeStatesCount
            };
        } catch (error) {
            healthCheck.checks.orbitConfigs = { status: 'unhealthy', error: error.message };
            healthCheck.status = 'unhealthy';
        }

        const totalLatency = Date.now() - startTime;
        healthCheck.latency = totalLatency;

        // Set appropriate status code
        const statusCode = healthCheck.status === 'healthy' ? 200 : 503;
        
        logger.info('Health check completed', {
            status: healthCheck.status,
            latency: totalLatency,
            checks: Object.keys(healthCheck.checks).reduce((acc, key) => {
                acc[key] = healthCheck.checks[key].status;
                return acc;
            }, {})
        });

        res.status(statusCode).json(healthCheck);

    } catch (error) {
        logger.error('Health check failed', { error: error.message });
        res.status(500).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message,
            latency: Date.now() - startTime
        });
    }
});

/**
 * Detailed orbit system metrics
 */
router.get('/metrics', async (req, res) => {
    try {
        const metrics = {
            timestamp: new Date().toISOString(),
            orbit: {},
            system: {},
            performance: {}
        };

        // Orbit-specific metrics
        const orbitMetrics = await getOrbitMetrics();
        metrics.orbit = orbitMetrics;

        // System metrics
        const systemMetrics = getSystemMetrics();
        metrics.system = systemMetrics;

        // Performance metrics
        const performanceMetrics = await getPerformanceMetrics();
        metrics.performance = performanceMetrics;

        logger.debug('Metrics collected successfully', {
            orbitConfigs: orbitMetrics.configurations.total,
            activeStates: orbitMetrics.transactionStates.active,
            memoryUsage: systemMetrics.memory.usedMB
        });

        res.json(metrics);

    } catch (error) {
        logger.error('Metrics collection failed', { error: error.message });
        res.status(500).json({
            error: 'Failed to collect metrics',
            timestamp: new Date().toISOString(),
            message: error.message
        });
    }
});

/**
 * Contract health check for a specific workspace
 */
router.get('/health/contracts/:workspaceId', async (req, res) => {
    const { workspaceId } = req.params;
    const startTime = Date.now();

    try {
        // Find workspace and orbit config
        const workspace = await Workspace.findByPk(workspaceId, {
            include: [{
                model: OrbitChainConfig,
                as: 'orbitConfig'
            }]
        });

        if (!workspace) {
            return res.status(404).json({
                error: 'Workspace not found',
                workspaceId
            });
        }

        if (!workspace.orbitConfig) {
            return res.status(404).json({
                error: 'No orbit configuration found for workspace',
                workspaceId
            });
        }

        // Check contract health
        const contractHealth = await checkContractHealth(workspace);
        
        const response = {
            workspaceId,
            status: contractHealth.allHealthy ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            latency: Date.now() - startTime,
            contracts: contractHealth.contracts
        };

        const statusCode = contractHealth.allHealthy ? 200 : 503;
        res.status(statusCode).json(response);

    } catch (error) {
        logger.error('Contract health check failed', { 
            workspaceId, 
            error: error.message 
        });
        
        res.status(500).json({
            workspaceId,
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString(),
            latency: Date.now() - startTime
        });
    }
});

/**
 * Get orbit-specific metrics
 */
async function getOrbitMetrics() {
    try {
        // Configuration metrics
        const totalConfigs = await OrbitChainConfig.count();
        const configsByType = await OrbitChainConfig.findAll({
            attributes: [
                'chainType',
                [sequelize.fn('COUNT', sequelize.col('*')), 'count']
            ],
            group: ['chainType']
        });

        // Transaction state metrics
        const stateDistribution = await OrbitTransactionState.findAll({
            attributes: [
                'currentState',
                [sequelize.fn('COUNT', sequelize.col('*')), 'count']
            ],
            group: ['currentState']
        });

        const recentStates = await OrbitTransactionState.count({
            where: {
                updatedAt: {
                    [sequelize.Sequelize.Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
                }
            }
        });

        const failedStates = await OrbitTransactionState.count({
            where: {
                currentState: 'FAILED'
            }
        });

        return {
            configurations: {
                total: totalConfigs,
                byType: configsByType.reduce((acc, item) => {
                    acc[item.chainType] = parseInt(item.dataValues.count);
                    return acc;
                }, {})
            },
            transactionStates: {
                total: stateDistribution.reduce((sum, item) => sum + parseInt(item.dataValues.count), 0),
                distribution: stateDistribution.reduce((acc, item) => {
                    acc[item.currentState] = parseInt(item.dataValues.count);
                    return acc;
                }, {}),
                recent24h: recentStates,
                failed: failedStates,
                active: stateDistribution
                    .filter(item => ['SUBMITTED', 'SEQUENCED', 'POSTED', 'CONFIRMED'].includes(item.currentState))
                    .reduce((sum, item) => sum + parseInt(item.dataValues.count), 0)
            }
        };
    } catch (error) {
        logger.error('Failed to collect orbit metrics', { error: error.message });
        throw error;
    }
}

/**
 * Get system metrics
 */
function getSystemMetrics() {
    const memUsage = process.memoryUsage();
    
    return {
        node: {
            version: process.version,
            uptime: process.uptime(),
            pid: process.pid
        },
        memory: {
            usedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
            totalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
            externalMB: Math.round(memUsage.external / 1024 / 1024),
            rssMB: Math.round(memUsage.rss / 1024 / 1024)
        },
        cpu: {
            usage: process.cpuUsage()
        }
    };
}

/**
 * Get performance metrics
 */
async function getPerformanceMetrics() {
    try {
        // Average processing times for recent orbit transactions
        const recentStates = await OrbitTransactionState.findAll({
            where: {
                updatedAt: {
                    [sequelize.Sequelize.Op.gte]: new Date(Date.now() - 60 * 60 * 1000) // Last hour
                }
            },
            limit: 100,
            order: [['updatedAt', 'DESC']]
        });

        let totalProcessingTime = 0;
        let processedCount = 0;

        for (const state of recentStates) {
            if (state.submittedAt && state.updatedAt) {
                const processingTime = new Date(state.updatedAt) - new Date(state.submittedAt);
                totalProcessingTime += processingTime;
                processedCount++;
            }
        }

        const avgProcessingTime = processedCount > 0 ? Math.round(totalProcessingTime / processedCount) : 0;

        return {
            averageProcessingTimeMs: avgProcessingTime,
            recentTransactionsProcessed: processedCount,
            timeWindow: '1 hour'
        };
    } catch (error) {
        logger.error('Failed to collect performance metrics', { error: error.message });
        return {
            averageProcessingTimeMs: 0,
            recentTransactionsProcessed: 0,
            error: error.message
        };
    }
}

/**
 * Check health of orbit contracts for a workspace
 */
async function checkContractHealth(workspace) {
    const orbitConfig = workspace.orbitConfig;
    const orbitProvider = workspace.getProvider();
    const parentProvider = orbitConfig.getParentChainProvider();
    
    // Infrastructure contracts are deployed on parent chain
    const contracts = [
        { name: 'Rollup', address: orbitConfig.rollupContract },
        { name: 'Bridge', address: orbitConfig.bridgeContract },
        { name: 'SequencerInbox', address: orbitConfig.sequencerInboxContract },
        { name: 'Inbox', address: orbitConfig.inboxContract },
        { name: 'Outbox', address: orbitConfig.outboxContract }
    ].filter(contract => contract.address); // Only check configured contracts

    const contractResults = [];
    let allHealthy = true;

    // First check parent chain connectivity
    try {
        const startTime = Date.now();
        const network = await parentProvider.getNetwork();
        const latency = Date.now() - startTime;
        
        const parentChainResult = {
            name: 'ParentChain',
            chainId: network.chainId,
            expectedChainId: orbitConfig.parentChainId,
            healthy: network.chainId === orbitConfig.parentChainId,
            latency,
            rpcEndpoint: orbitConfig.parentChainRpcServer
        };
        
        if (network.chainId !== orbitConfig.parentChainId) {
            parentChainResult.error = `Chain ID mismatch: expected ${orbitConfig.parentChainId}, got ${network.chainId}`;
            allHealthy = false;
        }
        
        contractResults.push(parentChainResult);
        
    } catch (error) {
        contractResults.push({
            name: 'ParentChain',
            healthy: false,
            error: error.message,
            rpcEndpoint: orbitConfig.parentChainRpcServer
        });
        allHealthy = false;
    }

    // Check orbit chain connectivity  
    try {
        const startTime = Date.now();
        const network = await orbitProvider.getNetwork();
        const latency = Date.now() - startTime;
        
        contractResults.push({
            name: 'OrbitChain',
            chainId: network.chainId,
            healthy: true,
            latency,
            rpcEndpoint: workspace.rpcServer
        });
        
    } catch (error) {
        contractResults.push({
            name: 'OrbitChain',
            healthy: false,
            error: error.message,
            rpcEndpoint: workspace.rpcServer
        });
        allHealthy = false;
    }

    // Check infrastructure contracts on parent chain
    for (const contractInfo of contracts) {
        try {
            const startTime = Date.now();
            
            // Use parent provider since infrastructure contracts are deployed there
            const code = await parentProvider.getCode(contractInfo.address);
            const hasCode = code !== '0x';
            const latency = Date.now() - startTime;
            
            const result = {
                name: contractInfo.name,
                address: contractInfo.address,
                healthy: hasCode,
                latency,
                deployed: hasCode,
                chain: 'parent'
            };
            
            if (!hasCode) {
                result.error = 'No contract code found at address on parent chain';
                allHealthy = false;
            }
            
            contractResults.push(result);
            
        } catch (error) {
            contractResults.push({
                name: contractInfo.name,
                address: contractInfo.address,
                healthy: false,
                error: error.message,
                chain: 'parent'
            });
            allHealthy = false;
        }
    }

    return {
        allHealthy,
        contracts: contractResults
    };
}

module.exports = router;