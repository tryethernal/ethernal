/**
 * @fileoverview Batch block sync job.
 * Enqueues blockSync jobs for a range of blocks in manageable chunks.
 * Pre-filters already-synced blocks and validates workspace once per chunk
 * to reduce DB load compared to per-job validation in blockSync.
 * @module jobs/batchBlockSync
 */

const { enqueue, bulkEnqueue } = require('../lib/queue');
const { Workspace, Explorer, StripeSubscription, RpcHealthCheck, Block, OrbitChainConfig, OpChainConfig } = require('../models');
const { Op } = require('sequelize');
const logger = require('../lib/logger');

const CHUNK_SIZE = 5000;
const RECHUNK_DELAY = 3000;

module.exports = async job => {
    const data = job.data;

    if (!data.userId || !data.workspace || data.from === null || data.from === undefined || data.to === null || data.to === undefined) {
        return 'Missing parameter.';
    }

    const from = parseInt(data.from);
    const to = parseInt(data.to);

    if (from > to)
        return 'Invalid range.';

    const end = Math.min(from + CHUNK_SIZE - 1, to);

    // If workspaceId is provided, validate workspace and pre-filter existing blocks
    let workspaceId = data.workspaceId || null;
    if (workspaceId) {
        const workspace = await Workspace.findByPk(workspaceId, {
            include: [
                {
                    model: Explorer,
                    as: 'explorer',
                    attributes: ['id', 'shouldSync'],
                    include: {
                        model: StripeSubscription,
                        as: 'stripeSubscription',
                        attributes: ['id']
                    }
                },
                {
                    model: RpcHealthCheck,
                    as: 'rpcHealthCheck',
                    attributes: ['id', 'isReachable']
                },
                {
                    model: require('../models').IntegrityCheck,
                    as: 'integrityCheck',
                    attributes: ['id', 'isHealthy', 'isRecovering']
                }
            ]
        });

        if (!workspace)
            return 'Invalid workspace.';

        const isCustomL1Parent = workspace.isCustomL1Parent === true;

        if (!isCustomL1Parent) {
            if (!workspace.explorer)
                return 'No active explorer for this workspace';

            if (!workspace.explorer.shouldSync)
                return 'Sync is disabled';

            if (workspace.rpcHealthCheckEnabled && workspace.rpcHealthCheck && !workspace.rpcHealthCheck.isReachable)
                return 'RPC is not reachable';

            if (!workspace.explorer.stripeSubscription)
                return 'No active subscription';
        }

        // Pre-filter: find blocks that already exist in this range
        const existingBlocks = await Block.findAll({
            where: {
                workspaceId,
                number: { [Op.between]: [from, end] }
            },
            attributes: ['number'],
            raw: true
        });

        const existingSet = new Set(existingBlocks.map(b => Number(b.number)));

        // Check if workspace needs L2 configurations loaded
        // Use model-based approach for compatibility with test mocks
        const [hasOrbitConfigs, hasOpConfigs] = await Promise.all([
            OrbitChainConfig.findOne({
                where: {
                    [Op.or]: [
                        { workspaceId },
                        { parentWorkspaceId: workspaceId }
                    ]
                },
                attributes: ['id'],
                limit: 1
            }),
            OpChainConfig.findOne({
                where: { workspaceId },
                attributes: ['id'],
                limit: 1
            })
        ]);
        const hasL2Configs = !!(hasOrbitConfigs || hasOpConfigs);

        // Cache workspace data to avoid N+1 queries in blockSync jobs
        const cachedWorkspace = {
            rpcServer: workspace.rpcServer,
            browserSyncEnabled: workspace.browserSyncEnabled,
            isCustomL1Parent: workspace.isCustomL1Parent,
            rpcHealthCheckEnabled: workspace.rpcHealthCheckEnabled,
            public: workspace.public,
            rateLimitInterval: workspace.rateLimitInterval,
            rateLimitMaxInInterval: workspace.rateLimitMaxInInterval,
            hasL2Configs,
            explorer: workspace.explorer ? {
                id: workspace.explorer.id,
                shouldSync: workspace.explorer.shouldSync,
                stripeSubscription: workspace.explorer.stripeSubscription ? {
                    id: workspace.explorer.stripeSubscription.id
                } : null
            } : null,
            rpcHealthCheck: workspace.rpcHealthCheck ? {
                id: workspace.rpcHealthCheck.id,
                isReachable: workspace.rpcHealthCheck.isReachable
            } : null,
            integrityCheck: workspace.integrityCheck ? {
                id: workspace.integrityCheck.id,
                isHealthy: workspace.integrityCheck.isHealthy,
                isRecovering: workspace.integrityCheck.isRecovering
            } : null
        };

        const jobs = [];
        for (let i = from; i <= end; i++) {
            if (existingSet.has(i)) continue;
            jobs.push({
                name: `blockSync-batch-${data.userId}-${data.workspace}-${i}`,
                data: {
                    userId: data.userId,
                    workspace: data.workspace,
                    workspaceId,
                    blockNumber: i,
                    source: data.source || 'batchSync',
                    rateLimited: true,
                    cachedWorkspace
                }
            });
        }

        if (jobs.length > 0)
            await bulkEnqueue('blockSync', jobs);

        logger.info(`batchBlockSync: enqueued ${jobs.length}/${end - from + 1} blocks (${existingBlocks.length} skipped) for workspace ${workspaceId}, range ${from}-${end}`);
    } else {
        // Backward compat: old jobs without workspaceId, enqueue all blocks
        const jobs = [];
        for (let i = from; i <= end; i++) {
            jobs.push({
                name: `blockSync-batch-${data.userId}-${data.workspace}-${i}`,
                data: {
                    userId: data.userId,
                    workspace: data.workspace,
                    blockNumber: i,
                    source: data.source || 'batchSync',
                    rateLimited: true
                }
            });
        }

        if (jobs.length > 0)
            await bulkEnqueue('blockSync', jobs);
    }

    // Self-re-enqueue for remaining blocks with delay for backpressure
    const nextStart = end + 1;
    if (nextStart <= to) {
        await enqueue('batchBlockSync', `batchBlockSync-${data.userId}-${data.workspace}-${nextStart}-${to}`, {
            userId: data.userId,
            workspace: data.workspace,
            workspaceId,
            from: nextStart,
            to,
            source: data.source || 'batchSync'
        }, null, null, RECHUNK_DELAY);
    }
};
