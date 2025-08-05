const { OrbitChainConfig } = require('../models');
const { enqueue } = require('../lib/queue');
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
        const errors = [];
        
        // Enqueue monitoring job for each workspace
        for (const config of orbitWorkspaces) {
            try {
                await enqueue(
                    'monitorOrbitBatches',
                    `monitorOrbitBatches-${config.workspaceId}`,
                    { workspaceId: config.workspaceId },
                    5 // Medium priority
                );
                
                enqueuedJobs++;
                
                logger.debug('Enqueued orbit batch monitoring', { 
                    ...jobContext, 
                    workspaceId: config.workspaceId,
                    workspaceName: config.workspace.name 
                });
                
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
            errors: errors.length,
            errorDetails: errors
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