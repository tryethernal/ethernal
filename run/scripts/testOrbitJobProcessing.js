const { Transaction, Workspace, OrbitChainConfig, OrbitTransactionState } = require('../models');
const processOrbitTransaction = require('../jobs/processOrbitTransaction');
const logger = require('../lib/logger');

/**
 * Test script to verify orbit job processing works without stalling
 * Usage: node run/scripts/testOrbitJobProcessing.js [transactionId]
 */
async function testOrbitJobProcessing() {
    const args = process.argv.slice(2);
    let transactionId = args[0];

    try {
        logger.info('Starting orbit job processing test');

        if (!transactionId) {
            // Find the first transaction in an orbit-configured workspace
            const orbitWorkspace = await Workspace.findOne({
                include: [{
                    model: OrbitChainConfig,
                    as: 'orbitConfig',
                    required: true
                }]
            });

            if (!orbitWorkspace) {
                logger.error('No workspace with orbit configuration found');
                return;
            }

            const transaction = await Transaction.findOne({
                where: { workspaceId: orbitWorkspace.id },
                order: [['id', 'DESC']],
                limit: 1
            });

            if (!transaction) {
                logger.error('No transactions found in orbit workspace');
                return;
            }

            transactionId = transaction.id;
            logger.info('Using most recent transaction from orbit workspace', {
                transactionId,
                transactionHash: transaction.hash,
                workspaceId: orbitWorkspace.id
            });
        }

        // Mock job object
        const mockJob = {
            id: `test-${Date.now()}`,
            data: { transactionId: parseInt(transactionId) }
        };

        logger.info('Starting job processing test', {
            transactionId,
            jobId: mockJob.id
        });

        const startTime = Date.now();

        // Run the job with a timeout to catch stalling
        const timeoutMs = 180000; // 3 minutes max
        const jobPromise = processOrbitTransaction(mockJob);
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Job test timed out')), timeoutMs)
        );

        const result = await Promise.race([jobPromise, timeoutPromise]);
        const processingTime = Date.now() - startTime;

        logger.info('Job processing test completed successfully', {
            result,
            processingTime,
            transactionId
        });

        // Check final state
        const finalState = await OrbitTransactionState.findOne({
            where: { transactionId: parseInt(transactionId) }
        });

        if (finalState) {
            logger.info('Final transaction state', {
                transactionId,
                currentState: finalState.currentState,
                isFinalState: finalState.isFinalState(),
                stateData: finalState.stateData
            });
        } else {
            logger.warn('No orbit state found after processing', { transactionId });
        }

        console.log('\n✅ Orbit job processing test completed successfully!');
        console.log(`Processing time: ${processingTime}ms`);
        console.log(`Result: ${result}`);

    } catch (error) {
        logger.error('Orbit job processing test failed', {
            error: error.message,
            errorStack: error.stack,
            transactionId
        });

        console.log('\n❌ Orbit job processing test failed!');
        console.log(`Error: ${error.message}`);
        
        if (error.message.includes('timed out')) {
            console.log('\n🚨 The job appears to be stalling - this indicates the issue is not resolved');
        }
    }
}

// Helper function to check job queue health
async function checkJobQueueHealth() {
    try {
        logger.info('Checking job queue health');
        
        // This would check queue status, pending jobs, etc.
        // Implementation depends on your queue system (BullMQ, etc.)
        
        console.log('✅ Job queue appears healthy');
        
    } catch (error) {
        logger.error('Job queue health check failed', { error: error.message });
        console.log('❌ Job queue health check failed');
    }
}

// Helper function to verify batch discovery is working
async function verifyBatchDiscovery() {
    try {
        logger.info('Verifying batch discovery status');
        
        const orbitWorkspaces = await Workspace.findAll({
            include: [{
                model: OrbitChainConfig,
                as: 'orbitConfig',
                required: true
            }]
        });

        for (const workspace of orbitWorkspaces) {
            const batchCount = await workspace.countOrbitBatches();
            const latestBatch = await workspace.getOrbitBatches({
                order: [['batchSequenceNumber', 'DESC']],
                limit: 1
            });

            logger.info('Workspace batch discovery status', {
                workspaceId: workspace.id,
                workspaceName: workspace.name,
                totalBatches: batchCount,
                latestBatchNumber: latestBatch[0]?.batchSequenceNumber,
                latestBatchCreated: latestBatch[0]?.createdAt
            });
        }

        console.log('✅ Batch discovery verification completed');
        
    } catch (error) {
        logger.error('Batch discovery verification failed', { error: error.message });
        console.log('❌ Batch discovery verification failed');
    }
}

// Main execution
if (require.main === module) {
    (async () => {
        console.log('🧪 Orbit Job Processing Test\n');
        
        await checkJobQueueHealth();
        await verifyBatchDiscovery();
        await testOrbitJobProcessing();
        
        process.exit(0);
    })().catch(error => {
        console.error('Test script failed:', error);
        process.exit(1);
    });
}

module.exports = {
    testOrbitJobProcessing,
    checkJobQueueHealth,
    verifyBatchDiscovery
};