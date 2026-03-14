/**
 * @fileoverview Block processing job.
 * Creates block events with gas analytics data (fee history).
 * @module jobs/processBlock
 */

const { Block, Workspace, Explorer } = require('../models');
const { sanitize, withTimeout } = require('../lib/utils');
const logger = require('../lib/logger');

module.exports = async job => {
    const data = job.data;

    if (!data.blockId)
        return 'Missing parameter';

    // Fast primary key lookup for block
    const block = await Block.findByPk(data.blockId, {
        attributes: ['id', 'number', 'gasUsed', 'gasLimit', 'workspaceId', 'timestamp', 'transactionsCount']
    });

    if (!block)
        return 'Cannot find block';

    // Separate fast lookups instead of expensive JOINs
    const workspace = await Workspace.findByPk(block.workspaceId, {
        attributes: ['id', 'public', 'rpcServer', 'networkId', 'name']
    });

    if (!workspace)
        return 'Cannot find workspace';

    if (!workspace.public)
        return 'Not allowed on private workspaces';

    const explorer = await Explorer.findOne({
        where: { workspaceId: workspace.id },
        attributes: ['id', 'shouldSync', 'gasAnalyticsEnabled']
    });

    if (!explorer)
        return 'Inactive explorer';

    if (!explorer.shouldSync)
        return 'Sync is disabled';

    let blockEvent = {};
    if (explorer.gasAnalyticsEnabled) {
        const client = workspace.getViemPublicClient();

        try {
            const feeHistory = await withTimeout(
                client.getFeeHistory({
                    blockCount: 1,
                    blockNumber: block.number,
                    rewardPercentiles: [20, 50, 75]
                }),
                30000 // 30 second timeout for RPC calls under heavy load
            );

            blockEvent = {
                baseFeePerGas: feeHistory.baseFeePerGas[0].toString(),
                gasUsedRatio: feeHistory.gasUsedRatio[0].toString(),
                priorityFeePerGas: feeHistory.reward[0].map(x => x.toString())
            };
        } catch (error) {
            if (error.code == -32601)
                await explorer.update({ gasAnalyticsEnabled: false });
            else
                logger.warn(`getFeeHistory failed for block ${block.number}: ${error.message}`);
        }
    }

    return block.safeCreateEvent(sanitize({
        ...blockEvent,
        gasUsed: block.gasUsed,
        gasLimit: block.gasLimit,
    }));
};
