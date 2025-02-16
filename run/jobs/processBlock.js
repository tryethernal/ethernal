const { Block, Workspace } = require('../models');

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

    const client = block.workspace.getViemPublicClient();

    const feeHistory = await client.getFeeHistory({
        blockCount: 1,
        blockNumber: block.number,
        rewardPercentiles: [20, 50, 75]
    });

    return block.safeCreateEvent({
        baseFeePerGas: feeHistory.baseFeePerGas[0].toString(),
        gasUsed: block.gasUsed,
        gasLimit: block.gasLimit,
        gasUsedRatio: feeHistory.gasUsedRatio[0].toString(),
        priorityFeePerGas: feeHistory.reward[0].map(x => x.toString())
    });
};
