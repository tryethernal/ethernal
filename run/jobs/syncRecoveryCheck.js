/**
 * @fileoverview Sync recovery check job.
 * Periodically checks auto-disabled explorers to see if their RPC has recovered.
 * Re-enables sync when RPC becomes reachable, using exponential backoff for retries.
 *
 * Backoff schedule: 5m -> 15m -> 1h -> 6h (max)
 * Max recovery attempts: 10 (after which manual intervention is required)
 *
 * @module jobs/syncRecoveryCheck
 */

const { Explorer, Workspace } = require('../models');
const { ProviderConnector } = require('../lib/rpc');
const { withTimeout } = require('../lib/utils');
const { Op } = require('sequelize');
const logger = require('../lib/logger');

// Process explorers in batches to avoid long-running jobs
const BATCH_SIZE = 50;

module.exports = async () => {
    // Find explorers that are due for a recovery check (with batch limit)
    // Excludes explorers that have reached max recovery attempts (nextRecoveryCheckAt is null)
    const explorers = await Explorer.findAll({
        where: {
            syncDisabledReason: { [Op.ne]: null },
            nextRecoveryCheckAt: { [Op.lte]: new Date() }
        },
        include: [{
            model: Workspace,
            as: 'workspace',
            attributes: ['id', 'rpcServer']
        }],
        limit: BATCH_SIZE,
        order: [['nextRecoveryCheckAt', 'ASC']]  // Process oldest first
    });

    if (explorers.length === 0) {
        return 'No explorers due for recovery check';
    }

    let recovered = 0;
    let stillUnreachable = 0;
    let maxAttemptsReached = 0;

    for (const explorer of explorers) {
        try {
            // Skip if workspace is missing
            if (!explorer.workspace || !explorer.workspace.rpcServer) {
                logger.warn({
                    message: 'Explorer recovery check skipped: no workspace or RPC server',
                    explorerId: explorer.id,
                    explorerSlug: explorer.slug
                });
                continue;
            }

            const provider = new ProviderConnector(explorer.workspace.rpcServer);
            const block = await withTimeout(provider.fetchLatestBlock());

            if (block) {
                // RPC is reachable - re-enable sync
                await explorer.enableSyncAfterRecovery();
                recovered++;

                logger.info({
                    message: 'Explorer re-enabled after RPC recovery',
                    explorerId: explorer.id,
                    explorerSlug: explorer.slug,
                    disabledReason: explorer.syncDisabledReason,
                    recoveryAttempts: explorer.recoveryAttempts
                });
            } else {
                // Block fetch returned null - still unreachable
                const result = await explorer.scheduleNextRecoveryCheck();
                if (result.maxReached) {
                    maxAttemptsReached++;
                    logger.warn({
                        message: 'Explorer reached max recovery attempts - manual intervention required',
                        explorerId: explorer.id,
                        explorerSlug: explorer.slug,
                        attempts: result.attempts
                    });
                } else {
                    stillUnreachable++;
                }
            }
        } catch (error) {
            // RPC check failed - schedule next check with backoff
            const result = await explorer.scheduleNextRecoveryCheck();
            if (result.maxReached) {
                maxAttemptsReached++;
                logger.warn({
                    message: 'Explorer reached max recovery attempts - manual intervention required',
                    explorerId: explorer.id,
                    explorerSlug: explorer.slug,
                    attempts: result.attempts
                });
            } else {
                stillUnreachable++;
            }

            logger.debug({
                message: 'Explorer recovery check failed',
                explorerId: explorer.id,
                explorerSlug: explorer.slug,
                error: error.message
            });
        }
    }

    return `Checked ${explorers.length} explorers: ${recovered} recovered, ${stillUnreachable} still unreachable, ${maxAttemptsReached} max attempts reached`;
};
