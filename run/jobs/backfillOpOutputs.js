/**
 * @fileoverview Backfill job for OP Stack state outputs.
 * Fetches DisputeGameCreated events directly from L1 RPC.
 * @module jobs/backfillOpOutputs
 */

const { OpChainConfig, OpOutput, Workspace } = require('../models');
const { ProviderConnector } = require('../lib/rpc');
const { parseDisputeGameCreated, EVENT_SIGNATURES } = require('../lib/opEvents');
const logger = require('../lib/logger');

module.exports = async job => {
    const data = job.data || {};
    const { workspaceId, fromBlock, toBlock, batchSize = 10 } = data;

    try {
        // Get OP chain config
        const configWhere = workspaceId ? { workspaceId } : {};
        const opConfigs = await OpChainConfig.findAll({
            where: configWhere,
            include: [{
                model: Workspace,
                as: 'parentWorkspace',
                attributes: ['id', 'rpcServer']
            }]
        });

        if (opConfigs.length === 0) {
            return 'No OP chain configs found';
        }

        let totalOutputs = 0;

        for (const opConfig of opConfigs) {
            if (!opConfig.disputeGameFactoryAddress || !opConfig.parentWorkspace) {
                logger.info(`Skipping config ${opConfig.id}: missing dispute game factory or parent workspace`, { location: 'jobs.backfillOpOutputs' });
                continue;
            }

            const providerConnector = new ProviderConnector(opConfig.parentWorkspace.rpcServer);

            // Get block range
            let startBlock = fromBlock;
            let endBlock = toBlock;

            if (!startBlock) {
                // Start from earliest output or a reasonable start block
                const earliestOutput = await OpOutput.findOne({
                    where: { workspaceId: opConfig.workspaceId },
                    order: [['l1BlockNumber', 'ASC']]
                });
                // If no outputs, try to find a reasonable start (e.g., recent blocks)
                startBlock = earliestOutput ? earliestOutput.l1BlockNumber : 0;
            }

            if (!endBlock) {
                // End at latest L1 block
                try {
                    const latestBlock = await providerConnector.fetchLatestBlock();
                    endBlock = latestBlock.number;
                } catch (error) {
                    logger.error(`Failed to get latest block: ${error.message}`, { location: 'jobs.backfillOpOutputs' });
                    continue;
                }
            }

            logger.info(`Backfilling outputs for workspace ${opConfig.workspaceId} from block ${startBlock} to ${endBlock}`, { location: 'jobs.backfillOpOutputs' });

            // Fetch logs in batches
            for (let currentBlock = startBlock; currentBlock <= endBlock; currentBlock += batchSize) {
                const batchEnd = Math.min(currentBlock + batchSize - 1, endBlock);

                try {
                    const logs = await providerConnector.provider.getLogs({
                        address: opConfig.disputeGameFactoryAddress,
                        topics: [EVENT_SIGNATURES.DISPUTE_GAME_CREATED],
                        fromBlock: currentBlock,
                        toBlock: batchEnd
                    });

                    logger.info(`Found ${logs.length} dispute game events in blocks ${currentBlock}-${batchEnd}`, { location: 'jobs.backfillOpOutputs' });

                    for (const log of logs) {
                        try {
                            const gameData = parseDisputeGameCreated(log);

                            // Check if output already exists
                            const existing = await OpOutput.findOne({
                                where: {
                                    workspaceId: opConfig.workspaceId,
                                    l1TransactionHash: log.transactionHash.toLowerCase()
                                }
                            });

                            if (existing) continue;

                            // Get block timestamp and transaction
                            let timestamp = new Date();
                            let proposer = null;
                            try {
                                const block = await providerConnector.provider.getBlock(log.blockNumber);
                                if (block && block.timestamp) {
                                    timestamp = new Date(block.timestamp * 1000);
                                }
                                const tx = await providerConnector.provider.getTransaction(log.transactionHash);
                                if (tx) {
                                    proposer = tx.from;
                                }
                            } catch (e) {
                                // Use defaults if fetch fails
                            }

                            // Calculate challenge period end
                            const challengePeriodEnds = new Date(timestamp.getTime() + (opConfig.finalizationPeriodSeconds * 1000));

                            // Get output index (count of existing outputs)
                            const outputCount = await OpOutput.count({
                                where: { workspaceId: opConfig.workspaceId }
                            });

                            await OpOutput.create({
                                workspaceId: opConfig.workspaceId,
                                outputIndex: outputCount,
                                outputRoot: gameData.outputRoot,
                                l2BlockNumber: 0, // Would need to fetch from dispute game contract
                                l1BlockNumber: log.blockNumber,
                                l1TransactionHash: log.transactionHash,
                                proposer,
                                timestamp,
                                challengePeriodEnds,
                                disputeGameAddress: gameData.disputeGameAddress,
                                gameType: gameData.gameType,
                                status: 'proposed'
                            });

                            totalOutputs++;
                        } catch (error) {
                            logger.error(`Error storing output from tx ${log.transactionHash}: ${error.message}`, { location: 'jobs.backfillOpOutputs', error });
                        }
                    }
                } catch (error) {
                    logger.error(`Error fetching logs for blocks ${currentBlock}-${batchEnd}: ${error.message}`, { location: 'jobs.backfillOpOutputs', error });
                }
            }
        }

        return `Backfilled ${totalOutputs} outputs`;
    } catch (error) {
        logger.error(`Backfill outputs job failed: ${error.message}`, { location: 'jobs.backfillOpOutputs', error });
        throw error;
    }
};
