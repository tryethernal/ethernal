const { Block, Workspace } = require('../models');
<<<<<<< HEAD
=======
const { sanitize } = require('../lib/utils');
>>>>>>> develop

module.exports = async job => {
    const data = job.data;

    if (!data.blockId)
        return 'Missing parameter';

    const block = await Block.findByPk(data.blockId, {
        include: {
            model: Workspace,
            as: 'workspace',
            include: 'explorer'
        }
    });

    if (!block)
        return 'Cannot find block';

    if (!block.workspace.public)
        return 'Not allowed on private workspaces';

    if (!block.workspace.explorer)
        return 'Inactive explorer';

    if (!block.workspace.explorer.shouldSync)
        return 'Sync is disabled';

    let blockEvent = {};
    if (block.workspace.explorer.gasAnalyticsEnabled) {
        const client = block.workspace.getViemPublicClient();

        try {
            const feeHistory = await client.getFeeHistory({
                blockCount: 1,
                blockNumber: block.number,
                rewardPercentiles: [20, 50, 75]
            });

            blockEvent = {
                baseFeePerGas: feeHistory.baseFeePerGas[0].toString(),
                gasUsedRatio: feeHistory.gasUsedRatio[0].toString(),
                priorityFeePerGas: feeHistory.reward[0].map(x => x.toString())
            };
        } catch (error) {
            if (error.code == -32601)
                await block.workspace.explorer.update({ gasAnalyticsEnabled: false });
        }
    }

    return block.safeCreateEvent(sanitize({
        ...blockEvent,
        gasUsed: block.gasUsed,
        gasLimit: block.gasLimit,
    }));
};
