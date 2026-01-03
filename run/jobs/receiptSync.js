/**
 * @fileoverview Receipt sync job.
 * Fetches transaction receipt from RPC and stores logs/events.
 * @module jobs/receiptSync
 */

const { ProviderConnector } = require('../lib/rpc');
const { Workspace, Explorer, StripeSubscription, Transaction, TransactionReceipt, RpcHealthCheck, OrbitChainConfig, OpChainConfig } = require('../models');
const { processRawRpcObject } = require('../lib/utils');
const { enqueue } = require('../lib/queue');
const RateLimiter = require('../lib/rateLimiter');
const logger = require('../lib/logger');
const {
    isTransactionDepositedEvent,
    isDisputeGameCreatedEvent,
    isOutputProposedEvent,
    parseTransactionDeposited,
    parseDisputeGameCreated,
    parseOutputProposed
} = require('../lib/opEvents');

module.exports = async job => {
    const data = job.data;

    if (!data.transactionHash || !data.workspaceId)
        return 'Missing parameter'

    const include = [
        {
            model: Workspace,
            as: 'workspace',
            attributes: ['id', 'rpcServer', 'rateLimitInterval', 'rateLimitMaxInInterval', 'public', 'rpcHealthCheckEnabled'],
            include: [
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
                    attributes: ['isReachable']
                },
                {
                    model: OrbitChainConfig,
                    as: 'orbitChildConfigs'
                },
                {
                    model: OrbitChainConfig,
                    as: 'orbitConfig'
                },
                {
                    model: OpChainConfig,
                    as: 'opChildConfigs'
                },
                {
                    model: OpChainConfig,
                    as: 'opConfig'
                }
            ]
        },
        {
            model: TransactionReceipt,
            as: 'receipt',
            attributes: ['id']
        }
    ];

    const transaction = data.transactionId ?
        await Transaction.findByPk(data.transactionId, { include }) :
        await Transaction.findOne({
            where: {
                hash: data.transactionHash,
                workspaceId: data.workspaceId
            },
            include
        });

    if (!transaction)
        return 'Missing transaction';

    if (transaction.receipt)
        return 'Receipt has already been synced';

    if (!transaction.workspace)
        return 'Missing workspace';

    const workspace = transaction.workspace;

    if (!workspace.public)
        return 'Cannot sync on private workspace';

    if (!workspace.explorer)
        return 'Inactive explorer';

    if (!workspace.explorer.shouldSync)
        return 'Disabled sync';

    if (workspace.rpcHealthCheck && workspace.rpcHealthCheckEnabled && !workspace.rpcHealthCheck.isReachable)
        return 'RPC is unreachable';

    if (!workspace.explorer.stripeSubscription)
        return 'No active subscription';

    let limiter;
    if (data.rateLimited && workspace.rateLimitInterval && workspace.rateLimitMaxInInterval)
        limiter = new RateLimiter(workspace.id, workspace.rateLimitInterval, workspace.rateLimitMaxInInterval);

    const providerConnector = new ProviderConnector(workspace.rpcServer, limiter);

    try {
        let receipt;
        try {
            receipt = await providerConnector.fetchTransactionReceipt(transaction.hash);
        } catch(error) {
            const priority = job.opts.priority || (data.source == 'cli-light' ? 1 : 10);
            if (error.message == 'Rate limited') {
                return enqueue('receiptSync', `receiptSync-${workspace.id}-${transaction.hash}-${Date.now()}`, {
                    transactionId: transaction.id,
                    transactionHash: transaction.hash,
                    workspaceId: workspace.id,
                    source: data.source,
                    rateLimited: !!data.rateLimited
                }, priority, null, workspace.rateLimitInterval, !!data.rateLimited);
            }
            else if (error.message.startsWith('Timed out after')) {
                return enqueue('receiptSync', `receiptSync-${workspace.id}-${transaction.hash}-${Date.now()}`, {
                    transactionId: transaction.id,
                    transactionHash: transaction.hash,
                    workspaceId: workspace.id,
                    source: data.source,
                    rateLimited: !!data.rateLimited
                }, priority, null, workspace.rateLimitInterval || 5000, !!data.rateLimited);
            }
            else
                throw error;
        }

        if (!receipt)
            throw new Error('Failed to fetch receipt');

        let processedReceipt = processRawRpcObject(
            receipt,
            Object.keys(TransactionReceipt.rawAttributes).concat(['logs']),
        );

        processedReceipt.workspace = workspace;

        const savedReceipt = await transaction.safeCreateReceipt(processedReceipt);

        // OP Stack event detection - check for deposits and outputs
        const opChildConfigs = workspace.opChildConfigs || [];

        for (const opConfig of opChildConfigs) {
            if (!processedReceipt.logs || processedReceipt.logs.length === 0) continue;

            for (const log of processedReceipt.logs) {
                // Check for TransactionDeposited events (deposits from L1 to L2)
                if (opConfig.optimismPortalAddress && isTransactionDepositedEvent(log, opConfig.optimismPortalAddress)) {
                    try {
                        const depositData = parseTransactionDeposited(log);
                        await enqueue('storeOpDeposit', `storeOpDeposit-${opConfig.workspaceId}-${transaction.hash}`, {
                            workspaceId: opConfig.workspaceId,
                            l1BlockNumber: transaction.blockNumber,
                            l1TransactionHash: transaction.hash,
                            l1TransactionId: transaction.id,
                            from: depositData.from,
                            to: depositData.to,
                            value: depositData.value,
                            gasLimit: depositData.gasLimit,
                            data: depositData.data,
                            isCreation: depositData.isCreation,
                            timestamp: transaction.timestamp || new Date()
                        }, 'high');
                        logger.info(`Detected OP deposit in tx ${transaction.hash}`, { location: 'jobs.receiptSync.opEvents' });
                    } catch (error) {
                        logger.error(`Error processing OP deposit event: ${error.message}`, { location: 'jobs.receiptSync.opEvents', error });
                    }
                }

                // Check for DisputeGameCreated events (modern fault proofs)
                if (opConfig.disputeGameFactoryAddress && isDisputeGameCreatedEvent(log, opConfig.disputeGameFactoryAddress)) {
                    try {
                        const gameData = parseDisputeGameCreated(log);
                        await enqueue('storeOpOutput', `storeOpOutput-${opConfig.workspaceId}-${transaction.hash}`, {
                            workspaceId: opConfig.workspaceId,
                            outputRoot: gameData.outputRoot,
                            l2BlockNumber: 0, // Would need to fetch from dispute game contract
                            l1BlockNumber: transaction.blockNumber,
                            l1TransactionHash: transaction.hash,
                            l1TransactionId: transaction.id,
                            proposer: transaction.from,
                            timestamp: transaction.timestamp || new Date(),
                            disputeGameAddress: gameData.disputeGameAddress,
                            gameType: gameData.gameType
                        }, 'high');
                        logger.info(`Detected OP dispute game in tx ${transaction.hash}`, { location: 'jobs.receiptSync.opEvents' });
                    } catch (error) {
                        logger.error(`Error processing OP dispute game event: ${error.message}`, { location: 'jobs.receiptSync.opEvents', error });
                    }
                }

                // Check for OutputProposed events (legacy L2OutputOracle)
                if (opConfig.l2OutputOracleAddress && isOutputProposedEvent(log, opConfig.l2OutputOracleAddress)) {
                    try {
                        const outputData = parseOutputProposed(log);
                        await enqueue('storeOpOutput', `storeOpOutput-${opConfig.workspaceId}-${transaction.hash}`, {
                            workspaceId: opConfig.workspaceId,
                            outputIndex: outputData.outputIndex,
                            outputRoot: outputData.outputRoot,
                            l2BlockNumber: outputData.l2BlockNumber,
                            l1BlockNumber: transaction.blockNumber,
                            l1TransactionHash: transaction.hash,
                            l1TransactionId: transaction.id,
                            proposer: transaction.from,
                            timestamp: transaction.timestamp || new Date()
                        }, 'high');
                        logger.info(`Detected OP output proposal in tx ${transaction.hash}`, { location: 'jobs.receiptSync.opEvents' });
                    } catch (error) {
                        logger.error(`Error processing OP output event: ${error.message}`, { location: 'jobs.receiptSync.opEvents', error });
                    }
                }
            }
        }

        return savedReceipt;
    } catch(error) {
        logger.error(error.message, { location: 'jobs.receiptSync', error, data });
        // await db.incrementFailedAttempts(transaction.workspace.id);
        throw error;
    }
};
