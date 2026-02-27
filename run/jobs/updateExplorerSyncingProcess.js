/**
 * @fileoverview Explorer sync process update job.
 * Manages PM2 processes for explorer block syncing based on status.
 * Auto-disables sync after repeated RPC failures with exponential backoff recovery.
 * @module jobs/updateExplorerSyncingProcess
 */

const { Explorer, Workspace, RpcHealthCheck, StripeSubscription, StripePlan } = require('../models');
const PM2 = require('../lib/pm2');
const logger = require('../lib/logger');

// Must match SYNC_FAILURE_THRESHOLD in explorer.js
const SYNC_FAILURE_THRESHOLD = 3;

module.exports = async job => {
    const data = job.data;

    if (!data.explorerSlug)
        return 'Missing parameter.';

    const explorer = await Explorer.findOne({
        where: { slug: data.explorerSlug },
        include: [
            {
                model: Workspace,
                as: 'workspace',
                required: false,
                include: {
                    model: RpcHealthCheck,
                    as: 'rpcHealthCheck',
                    required: false
                }
            },
            {
                model: StripeSubscription,
                as: 'stripeSubscription',
                required: false,
                include: {
                    model: StripePlan,
                    as: 'stripePlan',
                    required: false
                }
            }
        ]
    });

    try {

        const pm2 = new PM2(process.env.PM2_HOST, process.env.PM2_SECRET);
        const { data: existingProcess } = await pm2.find(data.explorerSlug);

        if (data.reset) {
            await pm2.reset(explorer.slug, explorer.workspaceId);
            return 'Process reset.';
        }
        else if (!explorer && existingProcess) {
            await pm2.delete(data.explorerSlug);
            return 'Process deleted: no explorer.';
        }
        else if (!explorer && !existingProcess) {
            return 'No process change.';
        }
        else if (explorer && !explorer.stripeSubscription) {
            await pm2.delete(explorer.slug);
            return 'Process deleted: no subscription.';
        }
        else if (explorer && !explorer.workspace) {
            await pm2.delete(explorer.slug);
            return 'Process deleted: no workspace.';
        }
        else if (explorer.workspace && explorer.workspace.rpcHealthCheck && !explorer.workspace.rpcHealthCheck.isReachable && existingProcess) {
            await pm2.delete(explorer.slug);
            // Track RPC failure and potentially auto-disable
            const result = await explorer.incrementSyncFailures('rpc_unreachable');
            if (result.disabled) {
                logger.info({
                    message: 'Explorer auto-disabled due to RPC failures',
                    explorerId: explorer.id,
                    explorerSlug: explorer.slug,
                    attempts: result.attempts,
                    reason: 'rpc_unreachable'
                });
                return `Process deleted and sync auto-disabled after ${result.attempts} RPC failures.`;
            }
            return `Process deleted: RPC is not reachable (attempt ${result.attempts}/${SYNC_FAILURE_THRESHOLD}).`;
        }
        else if (!explorer.shouldSync && existingProcess) {
            await pm2.delete(explorer.slug);
            return 'Process deleted: sync is disabled.';
        }
        else if (await explorer.hasReachedTransactionQuota()) {
            await pm2.delete(explorer.slug);
            return 'Process deleted: transaction quota reached.';
        }
        else if (explorer.shouldSync && !existingProcess) {
            await pm2.start(explorer.slug, explorer.workspaceId);
            // Reset failure counter on successful start
            if (explorer.syncFailedAttempts > 0) {
                await explorer.update({ syncFailedAttempts: 0 });
            }
            return 'Process started.';
        }
        else if (explorer.shouldSync && existingProcess && existingProcess.pm2_env.status == 'stopped') {
            await pm2.resume(explorer.slug, explorer.workspaceId);
            // Reset failure counter on successful resume
            if (explorer.syncFailedAttempts > 0) {
                await explorer.update({ syncFailedAttempts: 0 });
            }
            return 'Process resumed.';
        }
        else
            return 'No process change.';
    } catch(error) {
        if (error.message.startsWith('Timed out after')) {
            // PM2 timeouts are transient infrastructure issues, not explorer-level problems.
            // Only log them — don't count towards auto-disable (only rpc_unreachable should).
            if (explorer) {
                logger.warn({
                    message: 'PM2 timed out for explorer sync process',
                    explorerId: explorer.id,
                    explorerSlug: explorer.slug
                });
            }
            return 'Timed out';
        }
        else
            throw error;
    }
};
