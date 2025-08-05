const OrbitTransactionProcessor = require('../lib/orbitTransactionProcessor');
const { Transaction, Workspace, OrbitBatch, OrbitTransactionState } = require('../models');
const { enqueue } = require('../lib/queue');
const { getOrbitConfig } = require('../lib/orbitConfig');
const logger = require('../lib/logger');

module.exports = async (job) => {
    const { transactionId } = job.data;
    const startTime = Date.now();
    const config = getOrbitConfig();
    
    const jobContext = {
        job: 'processOrbitTransaction',
        transactionId,
        jobId: job.id
    };
    
    if (!transactionId) {
        logger.error('Missing transactionId parameter', jobContext);
        return 'Missing transactionId parameter';
    }

    try {
        logger.info('Starting orbit transaction processing', jobContext);
        
        // Fetch transaction with workspace and orbit config
        const transaction = await Transaction.findByPk(transactionId, {
            include: [
                {
                    model: Workspace,
                    as: 'workspace',
                    include: ['orbitConfig']
                }
            ]
        });

        if (!transaction) {
            logger.error('Transaction not found', jobContext);
            return 'Transaction not found';
        }

        if (!transaction.workspace) {
            logger.error('Workspace not found for transaction', jobContext);
            return 'Workspace not found for transaction';
        }

        if (!transaction.workspace.orbitConfig) {
            logger.error('Workspace is not configured as an Orbit chain', jobContext);
            return 'Workspace is not configured as an Orbit chain';
        }

        const extendedContext = {
            ...jobContext,
            transactionHash: transaction.hash,
            workspaceId: transaction.workspace.id,
            workspaceName: transaction.workspace.name
        };

        // Check if batch discovery has run recently for this workspace
        await ensureBatchDiscoveryCompleted(transaction.workspace.id, extendedContext);

        // Create processor with timeout wrapper
        const processor = new OrbitTransactionProcessor(transaction);
        
        // Validate contracts are accessible before processing (with timeout)
        logger.debug('Validating orbit contracts', extendedContext);
        await Promise.race([
            processor.validateContracts(),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Contract validation timeout')), 30000)
            )
        ]);
        
        // Check existing state before processing
        const existingState = await OrbitTransactionState.findOne({
            where: { transactionId: transaction.id }
        });
        
        logger.debug('Current transaction state', {
            ...extendedContext,
            currentState: existingState?.currentState || 'NONE',
            isFinalState: existingState?.isFinalState() || false
        });

        // Skip processing if already in final state
        if (existingState?.isFinalState()) {
            const processingTime = Date.now() - startTime;
            logger.info('Transaction already in final state, skipping processing', {
                ...extendedContext,
                finalState: existingState.currentState,
                processingTime
            });
            return `Transaction ${transaction.hash} already in final state: ${existingState.currentState}`;
        }
        
        // Process the transaction state with timeout and retry logic
        const orbitState = await processWithTimeoutAndRetry(processor, extendedContext);
        
        const processingTime = Date.now() - startTime;
        const result = `Processed orbit transaction ${transaction.hash}, current state: ${orbitState.currentState}`;
        
        logger.info('Completed orbit transaction processing', {
            ...extendedContext,
            finalState: orbitState.currentState,
            processingTime,
            isFinalState: orbitState.isFinalState()
        });
        
        return result;
        
    } catch (error) {
        const processingTime = Date.now() - startTime;
        logger.error('Error in processOrbitTransaction job', {
            ...jobContext,
            error: error.message,
            errorStack: error.stack,
            processingTime
        });
        
        // If we have a transaction, try to mark its orbit state as failed
        await handleJobFailure(transactionId, error, jobContext);
        
        throw error;
    }
};

/**
 * Ensure batch discovery has completed recently for this workspace
 */
async function ensureBatchDiscoveryCompleted(workspaceId, context) {
    try {
        // Check when the last batch was discovered for this workspace
        const latestBatch = await OrbitBatch.findOne({
            where: { workspaceId },
            order: [['createdAt', 'DESC']],
            limit: 1
        });

        const lastDiscoveryTime = latestBatch ? new Date(latestBatch.createdAt) : null;
        const timeSinceLastDiscovery = lastDiscoveryTime ? Date.now() - lastDiscoveryTime.getTime() : Infinity;
        
        logger.debug('Checking batch discovery status', {
            ...context,
            lastDiscoveryTime: lastDiscoveryTime?.toISOString(),
            timeSinceLastDiscovery,
            latestBatchNumber: latestBatch?.batchSequenceNumber
        });

        // If no recent discovery (older than 5 minutes), trigger urgent discovery
        if (timeSinceLastDiscovery > 5 * 60 * 1000) {
            logger.info('Triggering urgent batch discovery', {
                ...context,
                reason: 'no_recent_discovery',
                timeSinceLastDiscovery
            });
            
            await enqueue(
                'discoverOrbitBatches',
                `discoverOrbitBatches-urgent-${workspaceId}-${Date.now()}`,
                { workspaceId },
                1 // Highest priority
            );
            
            // Wait a moment for the discovery to potentially complete
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

    } catch (error) {
        logger.warn('Failed to ensure batch discovery completion', {
            ...context,
            error: error.message
        });
        // Don't fail the main job for this
    }
}

/**
 * Process transaction with timeout and retry logic
 */
async function processWithTimeoutAndRetry(processor, context) {
    const config = getOrbitConfig();
    const maxRetries = 3;
    const timeoutMs = 120000; // 2 minutes
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            logger.debug('Processing transaction attempt', {
                ...context,
                attempt,
                maxRetries,
                timeoutMs
            });
            
            // Process with timeout
            const orbitState = await Promise.race([
                processor.process(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error(`Processing timeout after ${timeoutMs}ms`)), timeoutMs)
                )
            ]);
            
            logger.debug('Transaction processing completed', {
                ...context,
                attempt,
                currentState: orbitState.currentState
            });
            
            return orbitState;
            
        } catch (error) {
            const isLastAttempt = attempt === maxRetries;
            const isTimeoutError = error.message.includes('timeout');
            const isRpcError = error.message.includes('rate limit') || 
                              error.message.includes('block range') || 
                              error.code === 'SERVER_ERROR' ||
                              error.code === 'NETWORK_ERROR';
            
            logger.warn('Transaction processing attempt failed', {
                ...context,
                attempt,
                maxRetries,
                error: error.message,
                isTimeoutError,
                isRpcError,
                willRetry: !isLastAttempt
            });
            
            if (isLastAttempt) {
                throw error;
            }
            
            // Wait before retry, longer for RPC errors
            const retryDelay = isRpcError ? 10000 : 5000;
            logger.debug('Waiting before retry', { ...context, retryDelay, attempt });
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            
            // For RPC errors, trigger batch discovery again
            if (isRpcError) {
                try {
                    await enqueue(
                        'discoverOrbitBatches',
                        `discoverOrbitBatches-retry-${context.workspaceId}-${Date.now()}`,
                        { workspaceId: context.workspaceId },
                        1
                    );
                } catch (enqueueError) {
                    logger.warn('Failed to trigger retry batch discovery', {
                        ...context,
                        error: enqueueError.message
                    });
                }
            }
        }
    }
}

/**
 * Handle job failure by marking orbit state as failed
 */
async function handleJobFailure(transactionId, error, context) {
    try {
        const transaction = await Transaction.findByPk(transactionId);
        if (transaction) {
            const orbitState = await transaction.getOrbitState();
            if (orbitState && !orbitState.isFinalState()) {
                const errorMessage = `Job processing error: ${error.message}`;
                await orbitState.markAsFailed(errorMessage);
                
                logger.info('Marked orbit state as failed', {
                    ...context,
                    transactionHash: transaction.hash,
                    errorMessage
                });
            }
        }
    } catch (markFailedError) {
        logger.error('Error marking orbit state as failed', {
            ...context,
            originalError: error.message,
            markFailedError: markFailedError.message
        });
    }
}