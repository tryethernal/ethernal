const { OrbitChainConfig } = require('../models');
const { enqueue } = require('../lib/queue');
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
        const errors = [];
        
        // Enqueue discovery job for each workspace
        for (const config of orbitWorkspaces) {
            try {
                await enqueue(
                    'discoverOrbitBatches',
                    `discoverOrbitBatches-${config.workspaceId}`,
                    { workspaceId: config.workspaceId },
                    3 // High priority for discovery
                );
                
                enqueuedJobs++;
                
                logger.debug('Enqueued orbit batch discovery', { 
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
                
                logger.error('Failed to enqueue orbit batch discovery', { 
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