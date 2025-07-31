const { TokenTransfer, Workspace, Transaction } = require('../models');
const { getBalanceChange, getNativeBalanceChange } = require('../lib/rpc');
const logger = require('../lib/logger');

module.exports = async job => {
    const data = job.data;

    if (!data.tokenTransferId)
        return 'Missing parameter.';

    const tokenTransfer = await TokenTransfer.findByPk(data.tokenTransferId, {
        attributes: ['id', 'src', 'dst', 'token', 'transactionId', 'workspaceId'],
        include: [
            {
                model: Workspace,
                as: 'workspace',
                attributes: ['id', 'name', 'public', 'rpcServer']
            },
            {
                model: Transaction,
                as: 'transaction',
                attributes: ['id', 'blockNumber', 'hash']
            }
        ]
    });

    if (!tokenTransfer)
        return 'Cannot find token transfer';

    if (!tokenTransfer.workspace.public)
        return 'Not processing private workspaces';

    if (!tokenTransfer.transaction)
        return 'Could not find transaction';

    const workspace = tokenTransfer.workspace;
    const transaction = tokenTransfer.transaction;

    // Batch all balance change requests to process them in parallel
    const balanceChangePromises = [];
    
    // Add source address balance change request if not zero address
    if (tokenTransfer.src != '0x0000000000000000000000000000000000000000') {
        const balanceChangePromise = getBalanceChangeWithRetry(
            tokenTransfer.src, 
            tokenTransfer.token, 
            transaction.blockNumber, 
            workspace.rpcServer
        );
        balanceChangePromises.push(balanceChangePromise);
    }

    // Add destination address balance change request if not zero address
    if (tokenTransfer.dst != '0x0000000000000000000000000000000000000000') {
        const balanceChangePromise = getBalanceChangeWithRetry(
            tokenTransfer.dst, 
            tokenTransfer.token, 
            transaction.blockNumber, 
            workspace.rpcServer
        );
        balanceChangePromises.push(balanceChangePromise);
    }

    // Process all balance changes in parallel
    const balanceChangeResults = await Promise.allSettled(balanceChangePromises);
    
    // Filter successful results and non-zero changes
    const changes = balanceChangeResults
        .filter(result => result.status === 'fulfilled' && result.value && result.value.diff != '0')
        .map(result => result.value);

    // Create all balance changes in a single batch operation
    if (changes.length > 0) {
        await tokenTransfer.safeCreateBalanceChanges(changes);
    }

    return true;
};

// Helper function to get balance change with retry logic and better error handling
async function getBalanceChangeWithRetry(address, token, blockNumber, rpcServer) {
    const maxRetries = 2;
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const balanceChange = token == '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' ?
                await getNativeBalanceChange(address, blockNumber, rpcServer) :
                await getBalanceChange(address, token, blockNumber, rpcServer);

            return balanceChange;
        } catch (error) {
            lastError = error;
            
            // Don't retry on specific errors that indicate the call will always fail
            if (error.message && error.message.startsWith('missing revert data in call exception')) {
                logger.error(error.message, { 
                    location: 'jobs.processTokenTransfer', 
                    error: error, 
                    address, 
                    token, 
                    blockNumber,
                    attempt 
                });
                return null; // Return null instead of throwing to continue processing other addresses
            }
            
            // Log retry attempts
            if (attempt < maxRetries) {
                logger.warn(`Retrying balance change request for ${address} (attempt ${attempt + 1}/${maxRetries})`, {
                    location: 'jobs.processTokenTransfer',
                    error: error.message,
                    address,
                    token,
                    blockNumber
                });
                // Small delay before retry
                await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
            }
        }
    }

    // Log final failure
    logger.error(`Failed to get balance change for ${address} after ${maxRetries + 1} attempts`, {
        location: 'jobs.processTokenTransfer',
        error: lastError,
        address,
        token,
        blockNumber
    });

    throw lastError;
}
