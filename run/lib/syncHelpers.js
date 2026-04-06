/**
 * @fileoverview Shared helper functions for sync jobs.
 * @module lib/syncHelpers
 */

const logger = require('./logger');

// Re-export the threshold constant for use in API responses
const SYNC_FAILURE_THRESHOLD = 3;

/**
 * Report an RPC failure to the explorer and handle auto-disable logic.
 * Excludes rate-limited and timeout errors from failure counting since
 * they are expected/transient conditions, not actual RPC failures.
 *
 * @param {Error} error - The error that occurred
 * @param {Object} explorer - The explorer model instance
 * @param {string} jobName - Name of the job reporting the failure (e.g., 'blockSync', 'receiptSync')
 * @param {number} workspaceId - ID of the workspace
 * @returns {Promise<{shouldStop: boolean, message: string|null}>} - Whether the job should stop and optional message
 */
async function reportRpcFailure(error, explorer, jobName, workspaceId) {
    // Don't count rate limiting, timeouts, or transient network errors as failures
    if (error.message === 'Rate limited' || error.message.startsWith('Timed out after') || error.code === 'TRANSIENT_RPC_ERROR') {
        return { shouldStop: false, message: null };
    }

    // Only report if explorer exists and sync is enabled
    if (!explorer || !explorer.shouldSync) {
        return { shouldStop: false, message: null };
    }

    try {
        const result = await explorer.incrementSyncFailures('rpc_error');
        if (result.disabled) {
            logger.info({
                message: `Explorer auto-disabled due to RPC failures in ${jobName}`,
                explorerId: explorer.id,
                workspaceId: workspaceId,
                attempts: result.attempts
            });
            return {
                shouldStop: true,
                message: 'Sync disabled due to repeated RPC failures'
            };
        }
    } catch (reportError) {
        logger.warn({
            message: 'Failed to report sync failure',
            error: reportError.message,
            workspaceId: workspaceId
        });
    }

    return { shouldStop: false, message: null };
}

module.exports = {
    reportRpcFailure,
    SYNC_FAILURE_THRESHOLD
};
