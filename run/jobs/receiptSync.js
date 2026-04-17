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
const { reportRpcFailure } = require('../lib/syncHelpers');
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

    // Use cached workspace data if available (passed from blockSync for faster processing)
    const hasCachedWorkspace = data.cachedWorkspace && data.cachedWorkspace.rpcServer;

    // Quick receipt existence check first to avoid expensive queries for already-synced transactions
    if (!data.transactionId) {
        // For hash-based lookups, check if receipt already exists with a lightweight query
        const existingTransaction = await Transaction.findOne({
            where: {
                hash: data.transactionHash,
                workspaceId: data.workspaceId
            },
            attributes: ['id'],
            include: [{
                model: TransactionReceipt,
                as: 'receipt',
                attributes: ['id'],
                required: false
            }]
        });

        if (existingTransaction?.receipt) {
            return 'Receipt has already been synced';
        }
    }

    // When we have cached workspace data, use a much lighter query since we don't need workspace relationships
    const include = hasCachedWorkspace ? [
        {
            model: TransactionReceipt,
            as: 'receipt',
            attributes: ['id']
        }
    ] : [
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
                        attributes: ['id'],
                        required: false // LEFT JOIN to avoid filtering out explorers without subscriptions
                    },
                    required: false // LEFT JOIN to avoid filtering out workspaces without explorers
                },
                {
                    model: RpcHealthCheck,
                    as: 'rpcHealthCheck',
                    attributes: ['isReachable'],
                    required: false // LEFT JOIN to avoid filtering out workspaces without health checks
                }
                // Removed orbit/OP config includes - they will be loaded lazily if needed
            ]
        },
        {
            model: TransactionReceipt,
            as: 'receipt',
            attributes: ['id'],
            required: false // LEFT JOIN to avoid filtering out transactions without receipts
        }
    ];

    const transaction = data.transactionId ?
        await Transaction.findOne({
            where: {
                id: data.transactionId,
                workspaceId: data.workspaceId
            },
            attributes: ['id', 'hash', 'blockNumber', 'timestamp', 'from', 'to', 'workspaceId', 'requestId', 'data', 'gasPrice', 'type', 'value'],
            include
        }) :
        await Transaction.findOne({
            where: {
                hash: data.transactionHash,
                workspaceId: data.workspaceId
            },
            attributes: ['id', 'hash', 'blockNumber', 'timestamp', 'from', 'to', 'workspaceId', 'requestId', 'data', 'gasPrice', 'type', 'value'],
            include
        });

    if (!transaction)
        return 'Missing transaction';

    if (transaction.receipt)
        return 'Receipt has already been synced';

    // Use cached workspace data or fetch from transaction
    let rpcServer, rateLimitInterval, rateLimitMaxInInterval, isPublic;

    if (hasCachedWorkspace) {
        // Use cached data from blockSync - skip validation since blockSync already validated
        rpcServer = data.cachedWorkspace.rpcServer;
        rateLimitInterval = data.cachedWorkspace.rateLimitInterval;
        rateLimitMaxInInterval = data.cachedWorkspace.rateLimitMaxInInterval;
        isPublic = data.cachedWorkspace.public;

        if (!isPublic)
            return 'Cannot sync on private workspace';
    } else {
        // Fallback: full validation when no cached data
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

        rpcServer = workspace.rpcServer;
        rateLimitInterval = workspace.rateLimitInterval;
        rateLimitMaxInInterval = workspace.rateLimitMaxInInterval;
    }

    let limiter;
    if (data.rateLimited && rateLimitInterval && rateLimitMaxInInterval)
        limiter = new RateLimiter(data.workspaceId, rateLimitInterval, rateLimitMaxInInterval);

    const providerConnector = new ProviderConnector(rpcServer, limiter);

    try {
        let receipt;
        try {
            receipt = await providerConnector.fetchTransactionReceipt(transaction.hash);
        } catch(error) {
            const priority = job.opts.priority || (data.source == 'cli-light' ? 1 : 10);
            // Build job data, preserving cached workspace if available
            const requeueData = {
                transactionId: transaction.id,
                transactionHash: transaction.hash,
                workspaceId: data.workspaceId,
                source: data.source,
                rateLimited: !!data.rateLimited
            };
            if (data.cachedWorkspace) {
                requeueData.cachedWorkspace = data.cachedWorkspace;
            }

            // Report RPC failure to explorer (excludes rate limiting and timeouts)
            // Only available when we have the full workspace with explorer data
            if (!hasCachedWorkspace && transaction.workspace && transaction.workspace.explorer) {
                const failureResult = await reportRpcFailure(error, transaction.workspace.explorer, 'receiptSync', transaction.workspace.id);
                if (failureResult.shouldStop) {
                    return failureResult.message;
                }
            }

            if (error.message == 'Rate limited') {
                return enqueue('receiptSync', `receiptSync-${data.workspaceId}-${transaction.hash}-${Date.now()}`,
                    requeueData, priority, null, rateLimitInterval, !!data.rateLimited);
            }
            else if (error.message.startsWith('Timed out after')) {
                return enqueue('receiptSync', `receiptSync-${data.workspaceId}-${transaction.hash}-${Date.now()}`,
                    requeueData, priority, null, rateLimitInterval || 5000, !!data.rateLimited);
            }
            else
                throw error;
        }

        if (!receipt)
            return 'Receipt not available';

        let processedReceipt = processRawRpcObject(
            receipt,
            Object.keys(TransactionReceipt.rawAttributes).concat(['logs']),
        );

        // For safeCreateReceipt, we need to pass workspace context for L2 processing
        // When using cached data, construct a minimal workspace-like object
        // Note: cached path is only used for non-L2 workspaces (blockSync skips caching for orbit/OP),
        // so safe defaults for L2 fields are sufficient
        if (hasCachedWorkspace) {
            processedReceipt.workspace = {
                id: data.workspaceId,
                orbitConfig: null,
                orbitChildConfigs: [],
                opConfig: null,
                opChildConfigs: []
            };
        } else {
            // Lazy load all L2 configs only if we have logs that might contain events
            let orbitConfig = null;
            let orbitChildConfigs = [];
            let opConfig = null;
            let opChildConfigs = [];

            if (processedReceipt.logs && processedReceipt.logs.length > 0) {
                // Query all L2 configs in a single call when we have logs to process
                const workspaceWithL2Configs = await Workspace.findByPk(data.workspaceId, {
                    attributes: ['id'],
                    include: [
                        {
                            model: OrbitChainConfig,
                            as: 'orbitConfig',
                            include: {
                                model: require('../models').Workspace,
                                as: 'parentWorkspace',
                                attributes: ['id', 'rpcServer']
                            }
                        },
                        {
                            model: OrbitChainConfig,
                            as: 'orbitChildConfigs'
                        },
                        {
                            model: OpChainConfig,
                            as: 'opConfig'
                        },
                        {
                            model: OpChainConfig,
                            as: 'opChildConfigs'
                        }
                    ]
                });
                orbitConfig = workspaceWithL2Configs?.orbitConfig || null;
                orbitChildConfigs = workspaceWithL2Configs?.orbitChildConfigs || [];
                opConfig = workspaceWithL2Configs?.opConfig || null;
                opChildConfigs = workspaceWithL2Configs?.opChildConfigs || [];
            }

            // Build workspace object with lazily loaded L2 configs for safeCreateReceipt
            processedReceipt.workspace = {
                ...(transaction.workspace.get ? transaction.workspace.get({ plain: true }) : { ...transaction.workspace }),
                orbitConfig,
                orbitChildConfigs,
                opConfig,
                opChildConfigs
            };
        }

        const savedReceipt = await transaction.safeCreateReceipt(processedReceipt, { skipExistenceCheck: true });

        // Handle graceful failure when transaction was deleted during processing
        if (savedReceipt === 'Transaction no longer exists') {
            return savedReceipt;
        }

        // OP Stack event detection - use the already loaded configs for queue jobs
        // Note: opChildConfigs are already loaded above before safeCreateReceipt
        const opChildConfigs = (!hasCachedWorkspace && processedReceipt.workspace && processedReceipt.workspace.opChildConfigs) ? processedReceipt.workspace.opChildConfigs : [];

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
                        }, 1);
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
                        }, 1);
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
                        }, 1);
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
        throw error;
    }
};
