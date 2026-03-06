/**
 * @fileoverview Stalled block removal job.
 * Reverts blocks stuck in syncing state or triggers billing quota increase.
 * @module jobs/removeStalledBlock
 */

const { Block } = require('../models');
const { enqueue } = require('../lib/queue');

/**
 * Executes a database operation with retry logic for connection errors.
 * Retries up to 3 times with exponential backoff for connection issues.
 *
 * @param {Function} operation - The database operation to execute
 * @param {number} maxRetries - Maximum number of retry attempts
 * @returns {Promise<any>} Result of the database operation
 */
async function withDatabaseRetry(operation, maxRetries = 3) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;

            // Only retry for connection-related database errors
            const isConnectionError = error.name === 'SequelizeDatabaseError' &&
                (error.message.includes('Connection terminated unexpectedly') ||
                 error.message.includes('connection terminated') ||
                 error.message.includes('ECONNRESET') ||
                 error.message.includes('ENOTFOUND'));

            if (!isConnectionError || attempt === maxRetries) {
                throw error;
            }

            // Exponential backoff: 1s, 2s, 4s
            const delay = Math.pow(2, attempt - 1) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

module.exports = async (job) => {
    const data = job.data;

    if (!data.blockId)
        return 'Missing parameter';

    const block = await withDatabaseRetry(async () => {
        return Block.findByPk(data.blockId, {
            include: ['transactions']
        });
    });

    if (!block)
        return 'Could not find block';

    const hasTransactionSyncing = block.transactions.length > 0 && block.transactions.filter(t => t.isSyncing).length > 0;
    if (hasTransactionSyncing) {
        await block.revertIfPartial();
        return `Removed stalled block ${block.id} - Workspace ${block.workspaceId} - #${block.number}`;
    }
    else
        await enqueue('increaseStripeBillingQuota', `increaseStripeBillingQuota-${data.blockId}-${block.workspaceId}`, { blockId: data.blockId });

    return true;
};
