const { OrbitChainConfig } = require('../models');
const { enqueueBatchDiscovery, getQueueStatistics } = require('../lib/orbitBatchQueue');
const logger = require('../lib/logger');

/**
 * Starter job that enqueues batch discovery for all workspaces with orbit configuration
 * This ensures continuous background indexing of batches independent of transaction processing
 */
async function discoverOrbitBatchesStarter() {
    const jobContext = {
        job: 'discoverOrbitBatchesStarter'
    };
    
    try {
        logger.info('Starting orbit batch discovery for all configured workspaces', jobContext);
        
        // Find all workspaces with orbit configuration
        const orbitWorkspaces = await OrbitChainConfig.findAll({
            attributes: ['workspaceId'],
            include: [{
                model: require('../models').Workspace,
                as: 'workspace',
                attributes: ['id', 'name'],
                required: true
            }]
        });
        
        logger.debug('Found workspaces with orbit configuration', { 
            ...jobContext, 
            workspaceCount: orbitWorkspaces.length 
        });
        
        let enqueuedJobs = 0;
        let skippedJobs = 0;
        const errors = [];
        
        // Get current queue statistics
        const queueStats = getQueueStatistics();
        logger.debug('Current queue statistics', { ...jobContext, queueStats });
        
        // Enqueue discovery job for each workspace with rate limiting
        for (const config of orbitWorkspaces) {
            try {
                const result = await enqueueBatchDiscovery(config.workspaceId, {
                    reason: 'scheduled',
                    priority: 3,
                    maxAge: 120000 // 2 minutes cooldown
                });
                
                if (result.enqueued) {
                    enqueuedJobs++;
                    logger.debug('Enqueued orbit batch discovery', { 
                        ...jobContext, 
                        workspaceId: config.workspaceId,
                        workspaceName: config.workspace.name,
                        jobId: result.jobId
                    });
                } else {
                    skippedJobs++;
                    logger.debug('Skipped orbit batch discovery due to rate limiting', { 
                        ...jobContext, 
                        workspaceId: config.workspaceId,
                        workspaceName: config.workspace.name,
                        skipReason: result.reason
                    });
                }
                
            } catch (error) {
                const errorInfo = {
                    workspaceId: config.workspaceId,
                    workspaceName: config.workspace.name,
                    error: error.message
                };
                errors.push(errorInfo);
                
                logger.error('Failed to enqueue orbit batch discovery', { 
                    ...jobContext, 
                    ...errorInfo 
                });
            }
        }
        
        const result = {
            workspacesFound: orbitWorkspaces.length,
            jobsEnqueued: enqueuedJobs,
            jobsSkipped: skippedJobs,
            errors: errors.length,
            errorDetails: errors,
            queueStats: getQueueStatistics()
        };
        
        logger.info('Completed orbit batch discovery starter', { ...jobContext, ...result });
        
        return result;
        
    } catch (error) {
        logger.error('Error in orbit batch discovery starter', { 
            ...jobContext, 
            error: error.message 
        });
        throw error;
    }
}

module.exports = discoverOrbitBatchesStarter;