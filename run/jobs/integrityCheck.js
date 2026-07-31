/**
 * @fileoverview Integrity check job.
 * Detects missing blocks and gaps, enqueues recovery syncs.
 * @module jobs/integrityCheck
 */

const models = require('../models');
const { enqueue, bulkEnqueue } = require('../lib/queue');
const queueCaps = require('../lib/queueCaps');
const { withTimeout } = require('../lib/utils');
const moment = require('moment');
const logger = require('../lib/logger');

const Workspace = models.Workspace;

const DELAY_BEFORE_RECOVERY = 2 * 60;

module.exports = async job => {
    const data = job.data;

    if (!data.workspaceId)
        throw new Error('Missing parameter.');

    const workspace = await Workspace.findOne({
        where: { id: data.workspaceId },
        include: [
            {
                model: models.IntegrityCheck,
                as: 'integrityCheck',
                require: false,
                include: { model: models.Block, as: 'block' }
            },
            { model: models.User, as: 'user' },
            {
                model: models.Explorer,
                as: 'explorer',
                include: {
                    model: models.StripeSubscription,
                    as: 'stripeSubscription',
                    include: { model: models.StripePlan, as: 'stripePlan' }
                }
            }
        ]
    });

    if (!workspace)
        return 'Cannot find workspace';

    if (!workspace.public)
        return 'Not allowed on private workspaces';

    if (workspace.skipIntegrityCheck)
        return 'Integrity check disabled';

    if (!workspace.explorer)
        return 'Should have an explorer associated';

    if (workspace.explorer.stripeSubscription &&
        workspace.explorer.stripeSubscription.stripePlan &&
        workspace.explorer.stripeSubscription.stripePlan.capabilities.skipIntegrityCheck
    )
        return 'Integrity check disabled on this plan';

    if (workspace.explorer.isDemo)
        return 'No check on demo explorers';

    if (!workspace.explorer.shouldSync)
        return 'Sync is disabled';

    if (workspace.integrityCheckStartBlockNumber === null || workspace.integrityCheckStartBlockNumber === undefined)
        return 'Integrity checks not enabled';

    if (await workspace.explorer.hasReachedTransactionQuota())
        return 'Transaction quota reached';

    /*
        We don't want to start integrity checks if the sync has never been initiated.
        Mostly to avoid starting in recovery mode. Also, maybe there is a reason the
        sync hasn't been intiated yet.
    */
    const [lowestBlock] = await workspace.getBlocks({
        order: [['number', 'ASC']],
        limit: 1
    });
    if (!lowestBlock)
        return 'No block synced yet';

    /*
        If the first block does not exist, we sync it & exit, and the next run
        will be able to start integrity checks from it.
    */
    const [lowerBlock] = await workspace.getBlocks({
        where: { number: workspace.integrityCheckStartBlockNumber }
    });
    if (!lowerBlock) {
        return enqueue('blockSync', `blockSync-${workspace.id}-${workspace.integrityCheckStartBlockNumber}`, {
            workspaceId: workspace.id,
            blockNumber: workspace.integrityCheckStartBlockNumber,
            source: 'integrityCheck'
        }, 1);
    }

    const provider = workspace.getProvider();

    // Parallelize independent operations
    let latestReadyBlock, latestBlock;
    try {
        [latestReadyBlock, latestBlock] = await Promise.all([
            workspace.getLatestReadyBlock(),
            withTimeout(provider.fetchLatestBlock())
        ]);
    } catch (_error) {
        return 'Couldn\'t reach network';
    }

    if (!latestReadyBlock || !latestReadyBlock.timestamp || !latestReadyBlock.number)
        return 'Invalid latest ready block';
    /*
        If the latest block stored is more than 2 minutes away from the latest block on chain,
        we recover the range of missing blocks
    */
    const diff = moment.unix(latestBlock.timestamp).diff(moment(latestReadyBlock.timestamp), 'seconds');
    if (diff > DELAY_BEFORE_RECOVERY) {
        const recoveryStart = latestReadyBlock.number + 1;
        if (recoveryStart <= latestBlock.number) {
            await enqueue('batchBlockSync', `batchBlockSync-${workspace.id}-${recoveryStart}-${latestBlock.number}`, {
                userId: workspace.user.firebaseUserId,
                workspace: workspace.name,
                workspaceId: workspace.id,
                from: recoveryStart,
                to: latestBlock.number,
                source: 'recovery'
            });
        }
    }

    const lastCheckedBlock = workspace.integrityCheck && workspace.integrityCheck.block && workspace.integrityCheck.block.number != null
        ? workspace.integrityCheck.block.number
        : lowerBlock.number;
    const isFullScan = new Date().getMinutes() < 5;
    const scanLowerBound = isFullScan
        ? lowerBlock.number
        : Math.max(lowerBlock.number, lastCheckedBlock);

    const gaps = await workspace.findBlockGapsV2(scanLowerBound, latestBlock.number);

    if (gaps.length) {
        // Compute the budget: how many blocks can we queue for this workspace
        const cap = queueCaps.getCap('blockSync');
        let budget = Infinity;
        if (cap !== Infinity) {
            const isLow = await queueCaps.isLowTierWorkspace(workspace.id);
            if (isLow) {
                const inFlight = await queueCaps.countWaitingForWorkspace('blockSync', workspace.id);
                budget = Math.max(0, cap - inFlight);
            }
        }

        const batches = [];
        let truncated = false;

        // A budget of 0 means the workspace already has a full blockSync queue.
        // Queue nothing this cycle rather than building thousands of job payloads
        // that would be discarded on arrival.
        if (budget > 0) {
            let accumulatedBlocks = 0;

            for (let j = 0; j < gaps.length; j++) {
                const gap = gaps[j];
                if (!gap.blockStart || !gap.blockEnd)
                    continue;

                // The first eligible gap is always queued, even if it alone exceeds
                // the budget — otherwise a gap wider than the cap could never be
                // repaired at all.
                if (accumulatedBlocks > 0 && accumulatedBlocks >= budget) {
                    truncated = true;
                    break;
                }

                batches.push({
                    name:  `batchBlockSync-${workspace.id}-${gap.blockStart}-${gap.blockEnd}`,
                    data: {
                        userId: workspace.user.firebaseUserId,
                        workspace: workspace.name,
                        workspaceId: workspace.id,
                        from: gap.blockStart,
                        to: gap.blockEnd,
                        source: 'integrityCheck'
                    }
                });
                accumulatedBlocks += gap.blockEnd - gap.blockStart + 1;
            }
        }

        if (batches.length > 0)
            await bulkEnqueue('batchBlockSync', batches);

        // Surface budget-limited cycles: this is the signal that a workspace is
        // accumulating gaps faster than its queue allowance can repair them.
        if (truncated || budget === 0) {
            logger.info('integrityCheck: gap repair limited by queue budget', {
                workspaceId: workspace.id,
                totalGaps: gaps.length,
                queuedGaps: batches.length,
                budget,
                location: 'jobs.integrityCheck'
            });
        }
    }

    // Advance the integrity check cursor to track the furthest block scanned.
    // The cursor reflects the scan progress, not gap-free verification.
    // Gaps found in this pass have been handed to repair jobs for async processing.
    // The hourly full scan (isFullScan = true during the first 5 minutes of each hour)
    // serves as the safety net, re-detecting any blocks that never got filled.
    // This is intentional — the cursor must advance to avoid wasteful re-scanning.
    const [cursorBlock] = await workspace.getBlocks({
        where: { number: latestReadyBlock.number },
        attributes: ['id']
    });
    if (cursorBlock)
        await workspace.safeCreateOrUpdateIntegrityCheck({ blockId: cursorBlock.id });

    return true;
};
