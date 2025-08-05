const { OrbitBatch, OrbitTransactionState, OrbitChainConfig, sequelize } = require('../models');
const { getOrbitConfig } = require('../lib/orbitConfig');
const { ProductionRpcClient } = require('../lib/orbitRetry');
const logger = require('../lib/logger');
const { ethers } = require('ethers');

// Rollup ABI for status checking
const ROLLUP_ABI = [
    'function latestConfirmed() external view returns (uint64)',
    'function nodeCreatedAtBlock(uint64 nodeNum) external view returns (uint256)',
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
            logger.debug('No orbit configuration found for workspace', jobContext);
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
        
        logger.debug('Found batches to monitor', { 
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
        
        logger.debug('Checking batch against rollup state', { 
            ...batchContext, 
            latestConfirmed: latestConfirmedNumber 
        });
        
        // Determine new status based on batch sequence number and confirmed nodes
        let newStatus = batch.confirmationStatus;
        let metadata = {};
        
        // Simple heuristic: batches are typically confirmed in order
        // In a production system, you'd need to map batch numbers to rollup nodes more precisely
        if (batch.batchSequenceNumber <= latestConfirmedNumber) {
            if (batch.confirmationStatus === 'pending') {
                newStatus = 'confirmed';
                metadata.confirmedAt = new Date().toISOString();
                metadata.confirmingNode = latestConfirmedNumber;
            }
            
            // Check for finalization (simplified - in reality this involves challenge periods)
            const batchAge = Date.now() - new Date(batch.postedAt).getTime();
            const finalizationPeriod = 7 * 24 * 60 * 60 * 1000; // 7 days
            
            if (batchAge > finalizationPeriod && batch.confirmationStatus !== 'finalized') {
                newStatus = 'finalized';
                metadata.finalizedAt = new Date().toISOString();
                metadata.finalizedAfter = batchAge;
            }
        }
        
        // Update batch if status changed
        if (newStatus !== batch.confirmationStatus) {
            await batch.updateConfirmationStatus(newStatus, metadata);
            
            logger.info('Updated batch status', { 
                ...batchContext, 
                oldStatus: batch.confirmationStatus,
                newStatus,
                metadata 
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
        
        logger.debug('Found related transactions to update', { 
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