const models = require('../models');
const { enqueue, bulkEnqueue } = require('../lib/queue');
const { withTimeout } = require('../lib/utils');
const moment = require('moment');

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
            { model: models.Explorer, as: 'explorer' },
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
        return enqueue(`blockSync`, `blockSync-${workspace.id}-${workspace.integrityCheckStartBlockNumber}`, {
            userId: workspace.user.firebaseUserId,
            workspace: workspace.name,
            blockNumber: workspace.integrityCheckStartBlockNumber,
            source: 'integrityCheck'
        }, 1);
    }

    const latestReadyBlock = await workspace.getLatestReadyBlock();
    if (!latestReadyBlock || !latestReadyBlock.timestamp || !latestReadyBlock.number)
        return 'Invalid latest ready block';

    const provider = workspace.getProvider();
    let latestBlock;
    try {
        latestBlock = await withTimeout(provider.fetchLatestBlock());
    } catch (_error) {
        return "Couldn't reach network";
    }
    /*
        If the latest block stored is more than 2 minutes away from the latest block on chain,
        we recover the range of missing blocks
    */
    const diff = moment.unix(latestBlock.timestamp).diff(moment(latestReadyBlock.timestamp), 'seconds');
    if (diff > DELAY_BEFORE_RECOVERY) {
        await enqueue('batchBlockSync', `batchBlockSync-${workspace.id}-${latestReadyBlock.number}-${latestBlock.number}`, {
            userId: workspace.user.firebaseUserId,
            workspace: workspace.name,
            from: latestReadyBlock.number,
            to: latestBlock.number,
            source: 'recovery'
        });
    }

    const gaps = await workspace.findBlockGapsV2(lowerBlock.number, latestBlock.number);

    if (gaps.length) {
        const batches = [];
        for (let j = 0; j < gaps.length; j++) {
            const gap = gaps[j];
            if (gap.blockStart && gap.blockEnd) {
                batches.push({
                    name:  `batchBlockSync-${workspace.id}-${gap.blockStart}-${gap.blockEnd}`,
                    data: {
                        userId: workspace.user.firebaseUserId,
                        workspace: workspace.name,
                        from: gap.blockStart,
                        to: gap.blockEnd,
                        source: 'integrityCheck'
                    }
                });
            }
        }

        await bulkEnqueue('batchBlockSync', batches);
    }

    return true;
};
