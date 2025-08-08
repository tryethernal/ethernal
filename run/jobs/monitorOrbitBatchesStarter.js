const { OrbitChainConfig } = require('../models');
const { enqueueBatchMonitoring, getQueueStatistics } = require('../lib/orbitBatchQueue');
const logger = require('../lib/logger');

/**
 * Starter job that enqueues orbit batch monitoring for all workspaces with orbit configuration
 */
async function monitorOrbitBatchesStarter() {
    const jobContext = {
        job: 'monitorOrbitBatchesStarter'
    };
    
    try {
        logger.info('Starting orbit batch monitoring for all configured workspaces', jobContext);
        
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
        
        // Enqueue monitoring job for each workspace with rate limiting
        for (const config of orbitWorkspaces) {
            try {
                const result = await enqueueBatchMonitoring(config.workspaceId, {
                    reason: 'scheduled',
                    priority: 5,
                    maxAge: 300000 // 5 minutes cooldown
                });
                
                if (result.enqueued) {
                    enqueuedJobs++;
                    logger.debug('Enqueued orbit batch monitoring', { 
                        ...jobContext, 
                        workspaceId: config.workspaceId,
                        workspaceName: config.workspace.name,
                        jobId: result.jobId
                    });
                } else {
                    skippedJobs++;
                    logger.debug('Skipped orbit batch monitoring due to rate limiting', { 
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
                
                logger.error('Failed to enqueue orbit batch monitoring', { 
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
        
        logger.info('Completed orbit batch monitoring starter', { ...jobContext, ...result });
        
        return result;
        
    } catch (error) {
        logger.error('Error in orbit batch monitoring starter', { 
            ...jobContext, 
            error: error.message 
        });
        throw error;
    }
}

module.exports = monitorOrbitBatchesStarter;