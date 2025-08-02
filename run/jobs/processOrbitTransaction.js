const OrbitTransactionProcessor = require('../lib/orbitTransactionProcessor');
const { Transaction, Workspace } = require('../models');

module.exports = async (job) => {
    const { transactionId } = job.data;
    
    if (!transactionId) {
        return 'Missing transactionId parameter';
    }

    try {
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
            return 'Transaction not found';
        }

        if (!transaction.workspace) {
            return 'Workspace not found for transaction';
        }

        if (!transaction.workspace.orbitConfig) {
            return 'Workspace is not configured as an Orbit chain';
        }

        // Create processor and process the transaction
        const processor = new OrbitTransactionProcessor(transaction);
        
        // Validate contracts are accessible before processing
        await processor.validateContracts();
        
        // Process the transaction state
        const orbitState = await processor.process();
        
        return `Processed orbit transaction ${transaction.hash}, current state: ${orbitState.currentState}`;
        
    } catch (error) {
        console.error(`Error in processOrbitTransaction job for transaction ${transactionId}:`, error);
        
        // If we have a transaction, try to mark its orbit state as failed
        try {
            const transaction = await Transaction.findByPk(transactionId);
            if (transaction) {
                const orbitState = await transaction.getOrbitState();
                if (orbitState && !orbitState.isFinalState()) {
                    await orbitState.markAsFailed(`Job processing error: ${error.message}`);
                }
            }
        } catch (markFailedError) {
            console.error('Error marking orbit state as failed:', markFailedError);
        }
        
        throw error;
    }
};