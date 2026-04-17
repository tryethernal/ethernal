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

    // Use workspaceId in query for better performance on hypertables
    // TODO: Remove findByPk fallback after one deploy cycle (all legacy jobs without workspaceId will have drained)
    const block = data.workspaceId
        ? await Block.findOne({
            where: { id: data.blockId, workspaceId: data.workspaceId },
            attributes: ['id', 'number', 'gasUsed', 'gasLimit', 'workspaceId', 'timestamp', 'transactionsCount']
        })
        : await Block.findByPk(data.blockId, {
            attributes: ['id', 'number', 'gasUsed', 'gasLimit', 'workspaceId', 'timestamp', 'transactionsCount']
        });

    if (!block)
        return 'Cannot find block';

    // Parallel lookups for better performance - workspace and explorer don't depend on each other
    const [workspace, explorer] = await Promise.all([
        Workspace.findByPk(block.workspaceId, {
            attributes: ['id', 'public', 'rpcServer', 'networkId', 'name']
        }),
        Explorer.findOne({
            where: { workspaceId: block.workspaceId },
            attributes: ['id', 'shouldSync', 'gasAnalyticsEnabled']
        })
    ]);

    if (!workspace)
        return 'Cannot find workspace';

    if (!workspace.public)
        return 'Not allowed on private workspaces';

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
