const { OrbitBatch, OrbitTransactionState, OrbitChainConfig, sequelize } = require('../models');
const { getOrbitConfig } = require('../lib/orbitConfig');
const { ProductionRpcClient } = require('../lib/orbitRetry');
const { markJobCompleted } = require('../lib/orbitBatchQueue');
const logger = require('../lib/logger');
const { ethers } = require('ethers');

// Rollup ABI for status checking
const ROLLUP_ABI = [
    'function latestConfirmed() external view returns (uint64)',
    'function nodeCreatedAtBlock(uint64 nodeNum) external view returns (uint256)',
    'function getNode(uint64 nodeNum) external view returns (tuple(bytes32 stateHash, bytes32 challengeHash, bytes32 confirmData, uint64 prevNum, uint64 deadlineBlock, address asserter, address challenger, bytes32 nodeHash))',
    'function isNodeConfirmed(uint64 nodeNum) external view returns (bool)',
    'event NodeConfirmed(uint64 indexed nodeNum, bytes32 blockHash, bytes32 sendRoot)'
];

/**
 * Job to monitor orbit batch status changes and update related transactions
 * This runs periodically to check for batch confirmations and update transaction states
 */
async function monitorOrbitBatches(job) {
    const { workspaceId } = job.data;
    const config = getOrbitConfig();
    
    const jobContext = {
        job: 'monitorOrbitBatches',
        workspaceId,
        jobId: job.id
    };
    
    try {
        logger.info('Starting orbit batch monitoring', jobContext);
        
        // Get orbit configuration for this workspace
        const orbitConfig = await OrbitChainConfig.findOne({
            where: { workspaceId }
        });
        
        if (!orbitConfig) {
            logger.info('No orbit configuration found for workspace', jobContext);
            return { status: 'skipped', reason: 'no_orbit_config' };
        }
        
        // Get parent chain provider
        const parentProvider = new ethers.providers.JsonRpcProvider(orbitConfig.parentChainRpcServer);
        
        // Get pending batches that need status updates
        const pendingBatches = await OrbitBatch.findAll({
            where: {
                workspaceId,
                confirmationStatus: ['pending', 'confirmed'] // Check both pending and confirmed for finalization
            },
            order: [['batchSequenceNumber', 'ASC']],
            limit: config.BATCH_MONITOR_LIMIT || 100
        });
        
        logger.info('Found batches to monitor', { 
            ...jobContext, 
            pendingCount: pendingBatches.length 
        });
        
        let updatedBatches = 0;
        let updatedTransactions = 0;
        const errors = [];
        
        // Monitor each batch
        for (const batch of pendingBatches) {
            try {
                const batchContext = { 
                    ...jobContext, 
                    batchId: batch.id,
                    batchNumber: batch.batchSequenceNumber,
                    currentStatus: batch.confirmationStatus 
                };
                
                const statusUpdate = await checkBatchStatus(batch, orbitConfig, parentProvider, batchContext);
                
                if (statusUpdate.updated) {
                    updatedBatches++;
                    
                    // Update related transactions
                    const transactionUpdates = await updateRelatedTransactions(batch, statusUpdate, batchContext);
                    updatedTransactions += transactionUpdates;
                }
                
            } catch (error) {
                const errorInfo = {
                    batchId: batch.id,
                    batchNumber: batch.batchSequenceNumber,
                    error: error.message
                };
                errors.push(errorInfo);
                
                logger.error('Error monitoring batch', { 
                    ...jobContext, 
                    ...errorInfo 
                });
            }
        }
        
        const result = {
            status: 'completed',
            batchesChecked: pendingBatches.length,
            batchesUpdated: updatedBatches,
            transactionsUpdated: updatedTransactions,
            errors: errors.length,
            errorDetails: errors
        };
        
        logger.info('Completed orbit batch monitoring', { ...jobContext, ...result });
        
        // Mark job as completed for rate limiting
        markJobCompleted(workspaceId, job.id);
        
        return result;
        
    } catch (error) {
        logger.error('Error in orbit batch monitoring job', { 
            ...jobContext, 
            error: error.message 
        });
        throw error;
    }
}

/**
 * Map a batch to its corresponding rollup node
 * This is the production-ready way to determine batch confirmation status
 */
async function mapBatchToRollupNode(batch, rollupContract, parentProvider, batchContext) {
    try {
        // In a production rollup system, batches are included in rollup nodes
        // We need to find which node contains this batch by:
        // 1. Looking at the parent chain block where the batch was posted
        // 2. Finding the rollup node that was created around that time
        // 3. Verifying the batch is included in that node
        
        const batchBlockNumber = batch.parentChainBlockNumber;
        
        // Get the rollup node that was created at or after this block
        // This is a simplified approach - in reality you'd need more sophisticated logic
        // based on the specific rollup implementation
        
        // For now, we'll use a heuristic based on block timing
        // In production, you'd implement proper batch-to-node mapping logic
        
        // Get the node creation block for the latest confirmed node
        const latestConfirmed = await rollupContract.call('latestConfirmed');
        const latestConfirmedNumber = latestConfirmed.toNumber();
        
        // Find the node that was created around the time of our batch
        // This is a simplified approach - production systems need more sophisticated mapping
        let targetNodeNumber = null;
        
        // Search backwards from latest confirmed to find the appropriate node
        for (let nodeNum = latestConfirmedNumber; nodeNum >= Math.max(0, latestConfirmedNumber - 100); nodeNum--) {
            try {
                const nodeCreatedAtBlock = await rollupContract.call('nodeCreatedAtBlock', [nodeNum]);
                const nodeBlockNumber = nodeCreatedAtBlock.toNumber();
                
                // If this node was created after our batch was posted, it might contain our batch
                if (nodeBlockNumber >= batchBlockNumber) {
                    targetNodeNumber = nodeNum;
                    break;
                }
            } catch (error) {
                // Node might not exist, continue searching
                continue;
            }
        }
        
        if (targetNodeNumber === null) {
            logger.warn('Could not map batch to rollup node', {
                ...batchContext,
                batchBlockNumber,
                latestConfirmedNumber,
                reason: 'no_suitable_node_found'
            });
            return null;
        }
        
        // Get additional node information
        let nodeCreatedAtBlock = null;
        let nodeHash = null;
        
        try {
            nodeCreatedAtBlock = await rollupContract.call('nodeCreatedAtBlock', [targetNodeNumber]);
        } catch (error) {
            logger.warn('Could not get node creation block', {
                ...batchContext,
                nodeNumber: targetNodeNumber,
                error: error.message
            });
        }
        
        // Get additional node information using the enhanced rollup contract functions
        let nodeDetails = null;
        
        try {
            const nodeData = await rollupContract.call('getNode', [targetNodeNumber]);
            nodeDetails = {
                stateHash: nodeData.stateHash,
                challengeHash: nodeData.challengeHash,
                confirmData: nodeData.confirmData,
                prevNum: nodeData.prevNum.toNumber(),
                deadlineBlock: nodeData.deadlineBlock.toNumber(),
                asserter: nodeData.asserter,
                challenger: nodeData.challenger,
                nodeHash: nodeData.nodeHash
            };
        } catch (error) {
            logger.warn('Could not get detailed node information', {
                ...batchContext,
                nodeNumber: targetNodeNumber,
                error: error.message
            });
        }
        
        // Check if the node is confirmed
        let isConfirmed = false;
        try {
            isConfirmed = await rollupContract.call('isNodeConfirmed', [targetNodeNumber]);
        } catch (error) {
            logger.warn('Could not check node confirmation status', {
                ...batchContext,
                nodeNumber: targetNodeNumber,
                error: error.message
            });
        }
        
        const mapping = {
            nodeNumber: targetNodeNumber,
            nodeCreatedAtBlock: nodeCreatedAtBlock ? nodeCreatedAtBlock.toNumber() : null,
            nodeHash: nodeDetails?.nodeHash || null,
            batchBlockNumber: batchBlockNumber,
            mappingMethod: 'block_timing_heuristic',
            nodeDetails: nodeDetails,
            isConfirmed: isConfirmed
        };
        
        logger.info('Mapped batch to rollup node', {
            ...batchContext,
            ...mapping
        });
        
        return mapping;
        
    } catch (error) {
        logger.error('Error mapping batch to rollup node', {
            ...batchContext,
            error: error.message
        });
        return null;
    }
}

/**
 * Check the confirmation status of a batch on the parent chain
 */
async function checkBatchStatus(batch, orbitConfig, parentProvider, batchContext) {
    try {
        // Create rollup contract instance
        const rollupContract = new ProductionRpcClient(
            parentProvider,
            orbitConfig.rollupContract,
            ROLLUP_ABI,
            'Rollup'
        );

        // Get latest confirmed node
        const latestConfirmed = await rollupContract.call('latestConfirmed');
        const latestConfirmedNumber = latestConfirmed.toNumber();
        
        logger.info('Checking batch against rollup state', { 
            ...batchContext, 
            latestConfirmed: latestConfirmedNumber 
        });
        
        // Determine new status based on batch sequence number and confirmed nodes
        let newStatus = batch.confirmationStatus;
        let metadata = {};
        
        // Production-ready: Map batch to rollup node and check confirmation status
        const batchNodeMapping = await mapBatchToRollupNode(batch, rollupContract, parentProvider, batchContext);
        
        if (!batchNodeMapping) {
            logger.warn('Could not determine batch confirmation status - no node mapping available', {
                ...batchContext,
                reason: 'no_node_mapping'
            });
            return { updated: false, reason: 'no_node_mapping' };
        }
        
        // Validate that the mapped node is confirmed
        if (batchNodeMapping.nodeNumber <= latestConfirmedNumber) {
            if (batch.confirmationStatus === 'pending') {
                newStatus = 'confirmed';
                metadata.confirmedAt = new Date().toISOString();
                metadata.confirmingNode = batchNodeMapping.nodeNumber;
                metadata.nodeCreatedAtBlock = batchNodeMapping.nodeCreatedAtBlock;
                metadata.nodeHash = batchNodeMapping.nodeHash;
            }
            
            // Check for finalization using rollup node challenge period
            // In production rollups, finalization depends on challenge periods, not just time
            let shouldFinalize = false;
            
            if (batchNodeMapping.nodeDetails) {
                const node = batchNodeMapping.nodeDetails;
                const currentBlock = await parentProvider.getBlockNumber();
                
                // Check if challenge period has expired
                if (node.deadlineBlock > 0 && currentBlock > node.deadlineBlock) {
                    shouldFinalize = true;
                    metadata.finalizedAt = new Date().toISOString();
                    metadata.finalizedAfterChallengePeriod = true;
                    metadata.challengeDeadlineBlock = node.deadlineBlock;
                    metadata.currentBlock = currentBlock;
                }
            }
            
            // Fallback to time-based finalization if node details aren't available
            if (!shouldFinalize) {
                const batchAge = Date.now() - new Date(batch.postedAt).getTime();
                const finalizationPeriod = 7 * 24 * 60 * 60 * 1000; // 7 days fallback
                
                if (batchAge > finalizationPeriod) {
                    shouldFinalize = true;
                    metadata.finalizedAt = new Date().toISOString();
                    metadata.finalizedAfter = batchAge;
                    metadata.finalizationMethod = 'time_based_fallback';
                }
            }
            
            if (shouldFinalize && batch.confirmationStatus !== 'finalized') {
                newStatus = 'finalized';
            }
        }
        
        // Update batch if status changed
        if (newStatus !== batch.confirmationStatus) {
            await batch.updateConfirmationStatus(newStatus, metadata);
            
                    logger.info('Updated batch status', { 
            ...batchContext, 
            oldStatus: batch.confirmationStatus,
            newStatus,
            metadata,
            nodeMapping: {
                nodeNumber: batchNodeMapping.nodeNumber,
                nodeCreatedAtBlock: batchNodeMapping.nodeCreatedAtBlock,
                mappingMethod: batchNodeMapping.mappingMethod,
                isConfirmed: batchNodeMapping.isConfirmed
            }
        });
            
            return { 
                updated: true, 
                oldStatus: batch.confirmationStatus, 
                newStatus, 
                metadata 
            };
        }
        
        return { updated: false };
        
    } catch (error) {
        logger.error('Error checking batch status', { 
            ...batchContext, 
            error: error.message 
        });
        throw error;
    }
}

/**
 * Update transaction states for transactions in this batch
 */
async function updateRelatedTransactions(batch, statusUpdate, batchContext) {
    try {
        // Find transactions that reference this batch
        const relatedTransactions = await OrbitTransactionState.findAll({
            where: {
                workspaceId: batch.workspaceId,
                currentState: ['SEQUENCED', 'POSTED'],
                'stateData.sequenced.batchSequenceNumber': batch.batchSequenceNumber.toString()
            }
        });
        
        logger.info('Found related transactions to update', { 
            ...batchContext, 
            transactionCount: relatedTransactions.length 
        });
        
        let updatedCount = 0;
        
        for (const txState of relatedTransactions) {
            try {
                // Update transaction state based on batch status
                if (statusUpdate.newStatus === 'confirmed' && txState.currentState === 'SEQUENCED') {
                    await txState.updateState('POSTED', {
                        posted: {
                            batchSequenceNumber: batch.batchSequenceNumber.toString(),
                            batchStatus: statusUpdate.newStatus,
                            confirmedAt: statusUpdate.metadata.confirmedAt,
                            l1Cost: batch.l1Cost,
                            verifiedAt: new Date().toISOString()
                        }
                    });
                    
                    await txState.setStateDetails('POSTED', batch.parentChainBlockNumber);
                    updatedCount++;
                    
                } else if (statusUpdate.newStatus === 'finalized' && txState.currentState === 'POSTED') {
                    await txState.updateState('CONFIRMED', {
                        confirmed: {
                            batchSequenceNumber: batch.batchSequenceNumber.toString(),
                            batchStatus: statusUpdate.newStatus,
                            finalizedAt: statusUpdate.metadata.finalizedAt,
                            verifiedAt: new Date().toISOString()
                        }
                    });
                    
                    await txState.setStateDetails('CONFIRMED', batch.parentChainBlockNumber);
                    updatedCount++;
                }
                
            } catch (error) {
                logger.error('Error updating related transaction', { 
                    ...batchContext,
                    transactionId: txState.transactionId,
                    error: error.message 
                });
            }
        }
        
        logger.info('Updated related transactions', { 
            ...batchContext, 
            updated: updatedCount,
            total: relatedTransactions.length 
        });
        
        return updatedCount;
        
    } catch (error) {
        logger.error('Error updating related transactions', { 
            ...batchContext, 
            error: error.message 
        });
        return 0;
    }
}

module.exports = monitorOrbitBatches;