/**
 * @fileoverview Block sync job.
 * Fetches a single block from RPC and stores it with transactions.
 * Enqueues receipt sync jobs for each transaction.
 * @module jobs/blockSync
 */

const { ProviderConnector } = require('../lib/rpc');
const { Workspace, Explorer, StripeSubscription, RpcHealthCheck, IntegrityCheck, Block, OrbitChainConfig, OpChainConfig, OpBatch, sequelize } = require('../models');
const db = require('../lib/firebase');
const logger = require('../lib/logger');
const { processRawRpcObject } = require('../lib/utils');
const { enqueue, bulkEnqueue } = require('../lib/queue');
const RateLimiter = require('../lib/rateLimiter');
const constants = require('../constants/orbit');
const { isBatchTransaction, getBatchInfo } = require('../lib/opBatches');

module.exports = async job => {
    const data = job.data;

    if (!data.userId || !data.workspace || data.blockNumber === undefined || data.blockNumber === null)
        return 'Missing parameter';

    const workspace = await Workspace.findOne({
        subQuery: false,
        where: {
            name: data.workspace,
            '$user.firebaseUserId$': data.userId
        },
        include: [
            'user',
            'orbitConfig',
            {
                model: OpChainConfig,
                as: 'opChildConfigs'
            },
            {
                model: Explorer,
                as: 'explorer',
                attributes: ['id', 'shouldSync'],
                include: {
                    model: StripeSubscription,
                    as: 'stripeSubscription',
                    attributes: ['id']
                }
            },
            {
                model: RpcHealthCheck,
                as: 'rpcHealthCheck',
                attributes: ['id', 'isReachable']
            },
            {
                model: IntegrityCheck,
                as: 'integrityCheck',
                attributes: ['id', 'isHealthy', 'isRecovering']
            }
        ]
    });

    if (!workspace)
        return 'Invalid workspace.';

    if (!workspace.explorer)
        return 'No active explorer for this workspace';

    if (!workspace.explorer.shouldSync)
        return 'Sync is disabled';

    if (workspace.rpcHealthCheckEnabled && workspace.rpcHealthCheck && !workspace.rpcHealthCheck.isReachable)
        return 'RPC is not reachable';

    if (!workspace.explorer.stripeSubscription)
        return 'No active subscription';

    if (workspace.browserSyncEnabled)
        await db.updateBrowserSync(workspace.id, false);

    if (data.source == 'recovery' && workspace.integrityCheck && workspace.integrityCheck.isHealthy)
        await db.updateWorkspaceIntegrityCheck(workspace.id, { status: 'recovering' });
    else if (data.source != 'recovery' && workspace.integrityCheck && workspace.integrityCheck.isRecovering)
        await db.updateWorkspaceIntegrityCheck(workspace.id, { status: 'healthy' });

    let limiter;
    if (data.rateLimited && workspace.rateLimitInterval && workspace.rateLimitMaxInInterval)
        limiter = new RateLimiter(workspace.id, workspace.rateLimitInterval, workspace.rateLimitMaxInInterval);
    const providerConnector = new ProviderConnector(workspace.rpcServer, limiter);
    let block;

    try {
        try {
            block = await providerConnector.fetchRawBlockWithTransactions(data.blockNumber);
        } catch(error) {
            const priority = job.opts.priority || (data.source == 'cli-light' ? 1 : 10);
            if (error.message == 'Rate limited') {
                return enqueue('blockSync', `blockSync-${workspace.id}-${data.blockNumber}-${Date.now()}`, {
                    userId: workspace.user.firebaseUserId,
                    workspace: workspace.name,
                    blockNumber: data.blockNumber,
                    source: data.source,
                    rateLimited: !!data.rateLimited
                }, priority, null, workspace.rateLimitInterval, !!data.rateLimited);
            }
            else if (error.message.startsWith('Timed out after')) {
                return enqueue('blockSync', `blockSync-${workspace.id}-${data.blockNumber}-${Date.now()}`, {
                    userId: workspace.user.firebaseUserId,
                    workspace: workspace.name,
                    blockNumber: data.blockNumber,
                    source: data.source,
                    rateLimited: !!data.rateLimited
                }, priority, null, workspace.rateLimitInterval || 5000, !!data.rateLimited);
            }
            else
                throw error;
        }

        if (!block)
            return "Couldn't fetch block from provider";

        const processedBlock = processRawRpcObject(
            block,
            Object.keys(Block.rawAttributes).concat(['transactions'])
        );

        const orbitChildConfigs = await OrbitChainConfig.findAll({
            where: {
                parentWorkspaceId: workspace.id
            }
        });

        if (workspace.orbitConfig || orbitChildConfigs.length > 0) {
            // Filter transactions to only include those that interact with rollupContract or sequencerInbox
            const contracts = [
                'rollupContract',
                'sequencerInboxContract',
                'bridgeContract',
                'inboxContract',
                'outboxContract',
                'stakeToken',
            
                'l1GatewayRouter',
                'l1Erc20Gateway',
                'l1WethGateway',
                'l1CustomGateway',
            
                'l2GatewayRouter',
                'l2Erc20Gateway',
                'l2WethGateway',
                'l2CustomGateway'
            ];

            let contractAddresses = [];
            for (const orbitConfig of orbitChildConfigs) {
                for (const contractKey of contracts) {
                    if (!orbitConfig[contractKey]) continue;
                    contractAddresses.push(orbitConfig[contractKey].toLowerCase());
                }
            }

            if (workspace.orbitConfig) {
                for (const contractKey of contracts) {
                    if (!workspace.orbitConfig[contractKey]) continue;
                    contractAddresses.push(workspace.orbitConfig[contractKey].toLowerCase());
                }
            }

            contractAddresses.push(constants.ARBSYS_ADDRESS.toLowerCase(), constants.ARB_RETRYABLE_TX_ADDRESS.toLowerCase());

            // Remove duplicates just in case
            contractAddresses = [...new Set(contractAddresses)];

            // Filter transactions whose 'to' field matches any of the contract addresses
            const filteredTransactions = processedBlock.transactions.filter(tx => {
                if (!tx.to) return false;
                return contractAddresses.includes(tx.to.toLowerCase());
            });

            if (filteredTransactions.length > 0)
                logger.info(`filteredTransactions: ${filteredTransactions.length}`);

            processedBlock.transactions = filteredTransactions;
            processedBlock.transactionsCount = filteredTransactions.length;
        }

        // OP Stack L1 filtering - only sync OP-relevant transactions
        if (workspace.opChildConfigs && workspace.opChildConfigs.length > 0) {
            let opContractAddresses = [];

            for (const opConfig of workspace.opChildConfigs) {
                if (opConfig.batchInboxAddress)
                    opContractAddresses.push(opConfig.batchInboxAddress.toLowerCase());
                if (opConfig.optimismPortalAddress)
                    opContractAddresses.push(opConfig.optimismPortalAddress.toLowerCase());
                if (opConfig.l2OutputOracleAddress)
                    opContractAddresses.push(opConfig.l2OutputOracleAddress.toLowerCase());
                if (opConfig.disputeGameFactoryAddress)
                    opContractAddresses.push(opConfig.disputeGameFactoryAddress.toLowerCase());
                if (opConfig.systemConfigAddress)
                    opContractAddresses.push(opConfig.systemConfigAddress.toLowerCase());
            }

            opContractAddresses = [...new Set(opContractAddresses)];

            const opFilteredTransactions = processedBlock.transactions.filter(tx => {
                if (!tx.to) return false;
                return opContractAddresses.includes(tx.to.toLowerCase());
            });

            if (opFilteredTransactions.length > 0)
                logger.info(`OP filtered transactions: ${opFilteredTransactions.length}`);

            processedBlock.transactions = opFilteredTransactions;
            processedBlock.transactionsCount = opFilteredTransactions.length;
        }

        const syncedBlock = await workspace.safeCreatePartialBlock(processedBlock);
        if (!syncedBlock)
            return "Couldn't store block";

        // OP Stack batch detection - use already-loaded opChildConfigs
        const opChildConfigs = workspace.opChildConfigs || [];

        for (const opConfig of opChildConfigs) {
            if (!opConfig.batchInboxAddress) continue;

            // Find transactions to the batch inbox address
            const batchTxs = processedBlock.transactions.filter(tx =>
                isBatchTransaction(tx, opConfig.batchInboxAddress)
            );

            // Get L1 block timestamp for batch parsing
            const l1Timestamp = typeof processedBlock.timestamp === 'string' && processedBlock.timestamp.startsWith('0x')
                ? parseInt(processedBlock.timestamp, 16)
                : Number(processedBlock.timestamp);

            for (const tx of batchTxs) {
                try {
                    const batchInfo = await getBatchInfo(tx, {
                        batchInboxAddress: opConfig.batchInboxAddress,
                        beaconUrl: workspace.beaconUrl,
                        workspaceId: opConfig.workspaceId,
                        l1Timestamp: l1Timestamp,
                        l2BlockTime: opConfig.l2BlockTime || 2
                    });

                    if (batchInfo) {
                        // Find the L1 transaction record if it exists
                        const l1Transaction = syncedBlock.transactions.find(t => t.hash === tx.hash);

                        // Use transaction with lock to prevent race condition on batch index
                        await sequelize.transaction(async (t) => {
                            const lastBatch = await OpBatch.findOne({
                                where: { workspaceId: opConfig.workspaceId },
                                order: [['batchIndex', 'DESC']],
                                lock: t.LOCK.UPDATE,
                                transaction: t
                            });
                            const nextBatchIndex = lastBatch ? lastBatch.batchIndex + 1 : 0;

                            // Convert hex values to integers
                            const l1BlockNumber = typeof batchInfo.l1BlockNumber === 'string' && batchInfo.l1BlockNumber.startsWith('0x')
                                ? parseInt(batchInfo.l1BlockNumber, 16)
                                : Number(batchInfo.l1BlockNumber);
                            const l1TransactionIndex = typeof batchInfo.l1TransactionIndex === 'string' && batchInfo.l1TransactionIndex.startsWith('0x')
                                ? parseInt(batchInfo.l1TransactionIndex, 16)
                                : Number(batchInfo.l1TransactionIndex);

                            await OpBatch.create({
                                workspaceId: opConfig.workspaceId,
                                batchIndex: nextBatchIndex,
                                l1BlockNumber: l1BlockNumber,
                                l1TransactionHash: batchInfo.l1TransactionHash,
                                l1TransactionId: l1Transaction ? l1Transaction.id : null,
                                l1TransactionIndex: l1TransactionIndex,
                                epochNumber: l1BlockNumber, // Epoch is typically the L1 block
                                timestamp: tx.timestamp ? new Date(tx.timestamp * 1000) : new Date(),
                                txCount: batchInfo.blockCount || null,
                                l2BlockStart: batchInfo.l2BlockStart,
                                l2BlockEnd: batchInfo.l2BlockEnd,
                                blobHash: batchInfo.blobHash,
                                blobData: batchInfo.blobData,
                                status: 'pending'
                            }, { transaction: t });

                            logger.info(`Created OP batch ${nextBatchIndex} for L2 workspace ${opConfig.workspaceId} from L1 tx ${tx.hash}`);
                        });
                    }
                } catch (error) {
                    logger.error(`Error processing OP batch for tx ${tx.hash}: ${error.message}`, { location: 'jobs.blockSync.opBatch', error });
                }
            }
        }

        const transactions = syncedBlock.transactions;
        const jobs = [];
        for (let i = 0; i < transactions.length; i++) {
            const transaction = transactions[i];
            jobs.push({
                name: `receiptSync-${workspace.id}-${transaction.hash}`,
                data: {
                    transactionId: transaction.id,
                    transactionHash: transaction.hash,
                    workspaceId: workspace.id,
                    source: data.source,
                    rateLimited: data.rateLimited
                }
            });
        }
        await bulkEnqueue('receiptSync', jobs, job.opts.priority);

        return 'Block synced';
    } catch(error) {
        console.log(error);
        logger.error(error.message, { location: 'jobs.blockSync', error, data });
        throw error;
    }
};
