/*
    This job checks the integrity of a workspace, by using the following.
    Here, "islands" refers to the islands & gap algorithm (See for example: https://medium.com/trendyol-tech/using-sqls-classical-islands-and-gaps-approach-for-data-quality-ddb05e27faa9)
    - Fetch latest block checked and check islands between (latest checked || integrity start block) and latest stored
    - If latest checked == latest stored, fetch the latest block from the chain
        - If same than latest stored, then OK do nothing
        - If different & mined less than DELAY_BEFORE_RECOVERY after latest checked, then OK do nothing (we assume a bit of latency for processing)
        - If different & mined more than DELAY_BEFORE_RECOVERY after latest checked, enqueue missing block for processing
    - If latest check != latest stored, update latest checked to latest stored

*/

const models = require('../models');
const db = require('../lib/firebase');
const { enqueue, bulkEnqueue } = require('../lib/queue');
const { withTimeout } = require('../lib/utils');
const moment = require('moment');

const Workspace = models.Workspace;

const DELAY_BEFORE_RECOVERY = 2 * 60;
const FETCH_LATEST_TIMEOUT = 10 * 1000;

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
            { model: models.User, as: 'user' }
        ]
    });

    if (!workspace)
        return 'Cannot find workspace';

    if (!workspace.public)
        return 'Not allowed on private workspaces';

    if (workspace.integrityCheckStartBlockNumber === null || workspace.integrityCheckStartBlockNumber === undefined)
        return 'Integrity checks not enabled';

    /*
        We don't want to start integrity checks if the sync has never been initiated.
        Mostly to avoid starting in recovery mode. Also, maybe there is a reason the
        sync hasn't been intiated yet.
    */
    const blockCount = await workspace.countBlocks();
    if (blockCount == 0)
        return 'No block synced yet';

    const [lowestBlock] = await workspace.getBlocks({
        order: [['number', 'ASC']],
        limit: 1
    });

    let lowerBlock;
    /*
        If we are just starting to check integrity, or if the start block is below/above
        the latest checked one (if we've changed it for example), we start from the
        starting block defined on the workspace.
    */
    if (
        !workspace.integrityCheck
        || workspace.integrityCheckStartBlockNumber < lowestBlock.number
        || (workspace.integrityCheck.block && workspace.integrityCheckStartBlockNumber > workspace.integrityCheck.block.number)
    ) {
        ([lowerBlock] = await workspace.getBlocks({
            where: { number: workspace.integrityCheckStartBlockNumber },
        }));

        /*
            If the first block does not exist, we sync it & exit, and the next run
            will be able to start integrity checks from it.
        */
        if (!lowerBlock) {
            return await enqueue(`blockSync`, `blockSync-${workspace.id}-${workspace.integrityCheckStartBlockNumber}`, {
                userId: workspace.user.firebaseUserId,
                workspace: workspace.name,
                blockNumber: workspace.integrityCheckStartBlockNumber,
                source: 'integrityCheck'
            }, 1);
        }

        await db.updateWorkspaceIntegrityCheck(workspace.id, { blockId: lowerBlock.id });
    }
    else {
        lowerBlock = workspace.integrityCheck.block;
    }

    const [upperBlock] = await workspace.getBlocks({
        order: [['number', 'DESC']],
        limit: 1
    });

    if (!lowerBlock || !upperBlock)
        return 'Missing lower block or upper block';

    if (lowerBlock.number == upperBlock.number) {
        const provider = workspace.getProvider();
        let latestBlock;
        try {
            latestBlock = await withTimeout(provider.fetchLatestBlock(), FETCH_LATEST_TIMEOUT);
        } catch(_error) {
            return "Couldn't reach network";
        }
        /*
            If the latest block stored is more than 2 minutes away from the latest block on chain,
            we recover the range of missing blocks
        */
        const diff = moment.unix(latestBlock.timestamp).diff(moment(upperBlock.timestamp), 'seconds');
        if (diff > DELAY_BEFORE_RECOVERY) {
            await enqueue('batchBlockSync', `batchBlockSync-${workspace.id}-${upperBlock.number}-${latestBlock.number}`, {
                userId: workspace.user.firebaseUserId,
                workspace: workspace.name,
                from: upperBlock.number,
                to: latestBlock.number,
                source: 'recovery'
            });
        }
    }

    const gaps = await workspace.findBlockGaps(lowerBlock.number, upperBlock.number);

    /*
        If we just handled a gap, We can't update latest block checked because sync is done asynchronously.
        So we just wait for the first run with no gaps.
    */
    if (!gaps.length) {
        if (lowerBlock.number != upperBlock.number)
            await db.updateWorkspaceIntegrityCheck(workspace.id, { blockId: upperBlock.id });
    }
    else {
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
