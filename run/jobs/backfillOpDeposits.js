/**
 * @fileoverview Backfill job for OP Stack deposits.
 * Fetches TransactionDeposited events directly from L1 RPC.
 * @module jobs/backfillOpDeposits
 */

const { OpChainConfig, OpDeposit, Workspace } = require('../models');
const { ProviderConnector } = require('../lib/rpc');
const { parseTransactionDeposited, EVENT_SIGNATURES } = require('../lib/opEvents');
const logger = require('../lib/logger');

module.exports = async job => {
    const data = job.data || {};
    const { workspaceId, fromBlock, toBlock, batchSize = 10000 } = data;

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

        let totalDeposits = 0;

        for (const opConfig of opConfigs) {
            if (!opConfig.optimismPortalAddress || !opConfig.parentWorkspace) {
                logger.info(`Skipping config ${opConfig.id}: missing portal address or parent workspace`, { location: 'jobs.backfillOpDeposits' });
                continue;
            }

            const providerConnector = new ProviderConnector(opConfig.parentWorkspace.rpcServer);

            // Get block range
            let startBlock = fromBlock;
            let endBlock = toBlock;

            if (!startBlock) {
                // Start from earliest deposit or block 0
                const earliestDeposit = await OpDeposit.findOne({
                    where: { workspaceId: opConfig.workspaceId },
                    order: [['l1BlockNumber', 'ASC']]
                });
                startBlock = earliestDeposit ? earliestDeposit.l1BlockNumber : 0;
            }

            if (!endBlock) {
                // End at latest L1 block
                try {
                    const latestBlock = await providerConnector.fetchLatestBlock();
                    endBlock = latestBlock.number;
                } catch (error) {
                    logger.error(`Failed to get latest block: ${error.message}`, { location: 'jobs.backfillOpDeposits' });
                    continue;
                }
            }

            logger.info(`Backfilling deposits for workspace ${opConfig.workspaceId} from block ${startBlock} to ${endBlock}`, { location: 'jobs.backfillOpDeposits' });

            // Fetch logs in batches
            for (let currentBlock = startBlock; currentBlock <= endBlock; currentBlock += batchSize) {
                const batchEnd = Math.min(currentBlock + batchSize - 1, endBlock);

                try {
                    const logs = await providerConnector.provider.getLogs({
                        address: opConfig.optimismPortalAddress,
                        topics: [EVENT_SIGNATURES.TRANSACTION_DEPOSITED],
                        fromBlock: currentBlock,
                        toBlock: batchEnd
                    });

                    logger.info(`Found ${logs.length} deposit events in blocks ${currentBlock}-${batchEnd}`, { location: 'jobs.backfillOpDeposits' });

                    for (const log of logs) {
                        try {
                            const depositData = parseTransactionDeposited(log);

                            // Check if deposit already exists
                            const existing = await OpDeposit.findOne({
                                where: {
                                    workspaceId: opConfig.workspaceId,
                                    l1TransactionHash: log.transactionHash.toLowerCase()
                                }
                            });

                            if (existing) continue;

                            // Get block timestamp
                            let timestamp = new Date();
                            try {
                                const block = await providerConnector.provider.getBlock(log.blockNumber);
                                if (block && block.timestamp) {
                                    timestamp = new Date(block.timestamp * 1000);
                                }
                            } catch (e) {
                                // Use current time if block fetch fails
                            }

                            await OpDeposit.create({
                                workspaceId: opConfig.workspaceId,
                                l1BlockNumber: log.blockNumber,
                                l1TransactionHash: log.transactionHash,
                                from: depositData.from,
                                to: depositData.to,
                                value: depositData.value,
                                gasLimit: depositData.gasLimit,
                                data: depositData.data,
                                isCreation: depositData.isCreation,
                                timestamp,
                                status: 'pending'
                            });

                            totalDeposits++;
                        } catch (error) {
                            logger.error(`Error storing deposit from tx ${log.transactionHash}: ${error.message}`, { location: 'jobs.backfillOpDeposits', error });
                        }
                    }
                } catch (error) {
                    logger.error(`Error fetching logs for blocks ${currentBlock}-${batchEnd}: ${error.message}`, { location: 'jobs.backfillOpDeposits', error });
                }
            }
        }

        return `Backfilled ${totalDeposits} deposits`;
    } catch (error) {
        logger.error(`Backfill deposits job failed: ${error.message}`, { location: 'jobs.backfillOpDeposits', error });
        throw error;
    }
};
