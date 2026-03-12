/**
 * @fileoverview Block processing job.
 * Creates block events with gas analytics data (fee history).
 * @module jobs/processBlock
 */

const { Block, Workspace } = require('../models');
const { sanitize, withTimeout } = require('../lib/utils');
const logger = require('../lib/logger');

module.exports = async job => {
    const data = job.data;

    if (!data.blockId)
        return 'Missing parameter';

    // Single optimized query with explicit subQuery: false to avoid slow nested SELECT
    const block = await Block.findByPk(data.blockId, {
        attributes: ['id', 'number', 'gasUsed', 'gasLimit', 'workspaceId', 'timestamp', 'transactionsCount'],
        include: {
            model: Workspace,
            as: 'workspace',
            attributes: ['id', 'public', 'rpcServer', 'networkId', 'name'],
            include: {
                model: require('../models').Explorer,
                as: 'explorer',
                attributes: ['id', 'shouldSync', 'gasAnalyticsEnabled'],
                required: false
            }
        },
        subQuery: false // Use JOIN instead of subquery for better performance
    });

    if (!block)
        return 'Cannot find block';

    if (!block.workspace)
        return 'Cannot find workspace';

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
                await block.workspace.explorer.update({ gasAnalyticsEnabled: false });
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
