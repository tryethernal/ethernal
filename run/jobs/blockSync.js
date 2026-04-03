/**
 * @fileoverview Block sync job.
 * Fetches a single block from RPC and stores it with transactions.
 * Enqueues receipt sync jobs for each transaction.
 * @module jobs/blockSync
 */

const { ProviderConnector } = require('../lib/rpc');
const { Workspace, Explorer, StripeSubscription, RpcHealthCheck, IntegrityCheck, Block, OpChainConfig, TransactionReceipt } = require('../models');
const db = require('../lib/firebase');
const logger = require('../lib/logger');
const { processRawRpcObject } = require('../lib/utils');
const { enqueue, bulkEnqueue } = require('../lib/queue');
const RateLimiter = require('../lib/rateLimiter');
const constants = require('../constants/orbit');
const { isBatchTransaction } = require('../lib/opBatches');
const { reportRpcFailure } = require('../lib/syncHelpers');

// Threshold for inline receipt fetching vs job queueing
const INLINE_RECEIPT_THRESHOLD = 10;
// Concurrency limit for parallel receipt storage
const RECEIPT_STORAGE_CONCURRENCY = 5;

module.exports = async job => {
    const data = job.data;

    // Require workspaceId to prevent N+1 query regressions
    if (!data.workspaceId)
        throw new Error('Missing workspaceId');

    if (data.blockNumber === undefined || data.blockNumber === null)
        throw new Error('Missing blockNumber');

    let workspace;

    // Use cached workspace data if available (passed from batchBlockSync for faster processing)
    const hasCachedWorkspace = data.cachedWorkspace && data.cachedWorkspace.rpcServer;

    if (hasCachedWorkspace) {
        // Fast path with cached data: skip database lookup for workspace validation

        // Reconstruct workspace object from cached data
        workspace = {
            id: data.workspaceId,
            rpcServer: data.cachedWorkspace.rpcServer,
            browserSyncEnabled: data.cachedWorkspace.browserSyncEnabled,
            isCustomL1Parent: data.cachedWorkspace.isCustomL1Parent,
            rpcHealthCheckEnabled: data.cachedWorkspace.rpcHealthCheckEnabled,
            public: data.cachedWorkspace.public,
            rateLimitInterval: data.cachedWorkspace.rateLimitInterval,
            rateLimitMaxInInterval: data.cachedWorkspace.rateLimitMaxInInterval,
            explorer: data.cachedWorkspace.explorer,
            rpcHealthCheck: data.cachedWorkspace.rpcHealthCheck
        };

        // Custom L1 parents don't require explorer/subscription - they sync for their L2 children
        const isCustomL1Parent = workspace.isCustomL1Parent === true;

        if (!isCustomL1Parent) {
            if (!workspace.explorer)
                return 'No active explorer for this workspace';

            if (!workspace.explorer.shouldSync)
                return 'Sync is disabled';

            if (workspace.rpcHealthCheckEnabled && workspace.rpcHealthCheck && !workspace.rpcHealthCheck.isReachable)
                return 'RPC is not reachable';

            if (!workspace.explorer.stripeSubscription)
                return 'No active subscription';
        }

        // Create Sequelize instance from cached data to avoid N+1 query
        workspace = Workspace.build({
            id: data.workspaceId,
            rpcServer: data.cachedWorkspace.rpcServer,
            browserSyncEnabled: data.cachedWorkspace.browserSyncEnabled,
            isCustomL1Parent: data.cachedWorkspace.isCustomL1Parent,
            rpcHealthCheckEnabled: data.cachedWorkspace.rpcHealthCheckEnabled,
            public: data.cachedWorkspace.public,
            rateLimitInterval: data.cachedWorkspace.rateLimitInterval,
            rateLimitMaxInInterval: data.cachedWorkspace.rateLimitMaxInInterval
        }, { isNewRecord: false });

        // Set up associations from cached data
        if (data.cachedWorkspace.explorer) {
            workspace.explorer = Explorer.build(data.cachedWorkspace.explorer, { isNewRecord: false });
            if (data.cachedWorkspace.explorer.stripeSubscription) {
                workspace.explorer.stripeSubscription = StripeSubscription.build(
                    data.cachedWorkspace.explorer.stripeSubscription,
                    { isNewRecord: false }
                );
            }
        }

        if (data.cachedWorkspace.rpcHealthCheck) {
            workspace.rpcHealthCheck = RpcHealthCheck.build(
                data.cachedWorkspace.rpcHealthCheck,
                { isNewRecord: false }
            );
        }

        if (data.cachedWorkspace.integrityCheck) {
            workspace.integrityCheck = IntegrityCheck.build(
                data.cachedWorkspace.integrityCheck,
                { isNewRecord: false }
            );
        }

        // L2 configs are now cached by batchBlockSync (orbitConfig / orbitChildConfigs / opChildConfigs
        // keys are always present in cachedWorkspace). They are applied to the workspace object below
        // after the block fetch, avoiding N+1 DB queries.

        // Disable browser sync to prevent concurrent syncing from both browser and server
        if (workspace.browserSyncEnabled)
            await workspace.update({ browserSyncEnabled: false });
    } else {
        // Fast path: uses workspaceId for optimized database lookup
        // L2 configs are loaded on-demand later to avoid expensive JOINs

        workspace = await Workspace.findByPk(data.workspaceId, {
            attributes: ['id', 'name', 'rpcServer', 'browserSyncEnabled', 'isCustomL1Parent', 'rpcHealthCheckEnabled', 'public', 'rateLimitInterval', 'rateLimitMaxInInterval'],
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

        // Custom L1 parents don't require explorer/subscription - they sync for their L2 children
        const isCustomL1Parent = workspace.isCustomL1Parent === true;

        if (!isCustomL1Parent) {
            if (!workspace.explorer)
                return 'No active explorer for this workspace';

            if (!workspace.explorer.shouldSync)
                return 'Sync is disabled';

            if (workspace.rpcHealthCheckEnabled && workspace.rpcHealthCheck && !workspace.rpcHealthCheck.isReachable)
                return 'RPC is not reachable';

            if (!workspace.explorer.stripeSubscription)
                return 'No active subscription';
        }


        // Disable browser sync to prevent concurrent syncing from both browser and server
        if (workspace.browserSyncEnabled)
            await workspace.update({ browserSyncEnabled: false });
    }

    // Load L2 configurations on-demand for non-cached path to avoid expensive JOINs in initial query
    if (!hasCachedWorkspace) {
        // Load L2 configs directly with LEFT JOINs - eliminates N+1 query pattern from separate existence checks
        const l2Configs = await Workspace.findByPk(data.workspaceId, {
            attributes: ['id'],
            include: [
                {
                    model: require('../models').OrbitChainConfig,
                    as: 'orbitConfig',
                    attributes: [
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
                    ],
                    required: false,
                    include: {
                        model: require('../models').Workspace,
                        as: 'parentWorkspace',
                        attributes: ['id', 'rpcServer'],
                        required: false
                    }
                },
                {
                    model: require('../models').OrbitChainConfig,
                    as: 'orbitChildConfigs',
                    attributes: [
                        'workspaceId',
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
                    ],
                    required: false
                },
                {
                    model: require('../models').OpChainConfig,
                    as: 'opChildConfigs',
                    attributes: [
                        'workspaceId',
                        'batchInboxAddress',
                        'beaconUrl',
                        'l2BlockTime',
                        'l2GenesisTimestamp'
                    ],
                    required: false
                }
            ]
        });

        if (l2Configs) {
            workspace.orbitConfig = l2Configs.orbitConfig;
            workspace.orbitChildConfigs = l2Configs.orbitChildConfigs;
            workspace.opChildConfigs = l2Configs.opChildConfigs;
        }
    }

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

            // Report RPC failure to explorer (excludes rate limiting and timeouts)
            const failureResult = await reportRpcFailure(error, workspace.explorer, 'blockSync', workspace.id);
            if (failureResult.shouldStop) {
                return failureResult.message;
            }

            if (error.message == 'Rate limited') {
                return enqueue('blockSync', `blockSync-${workspace.id}-${data.blockNumber}-${Date.now()}`, {
                    workspaceId: workspace.id,
                    blockNumber: data.blockNumber,
                    source: data.source,
                    rateLimited: !!data.rateLimited,
                    // Preserve cached workspace data to avoid N+1 query on retry
                    cachedWorkspace: data.cachedWorkspace
                }, priority, null, workspace.rateLimitInterval, !!data.rateLimited);
            }
            else if (error.message.startsWith('Timed out after')) {
                return enqueue('blockSync', `blockSync-${workspace.id}-${data.blockNumber}-${Date.now()}`, {
                    workspaceId: workspace.id,
                    blockNumber: data.blockNumber,
                    source: data.source,
                    rateLimited: !!data.rateLimited,
                    // Preserve cached workspace data to avoid N+1 query on retry
                    cachedWorkspace: data.cachedWorkspace
                }, priority, null, workspace.rateLimitInterval || 5000, !!data.rateLimited);
            }
            else if (error.message && error.message.includes('bad response (status=520)')) {
                // HTTP 520 errors are infrastructure/provider issues that should be retried
                // Cloudflare 520 = "Web Server Returned an Unknown Error" (upstream RPC provider issue)
                return enqueue('blockSync', `blockSync-${workspace.id}-${data.blockNumber}-${Date.now()}`, {
                    workspaceId: workspace.id,
                    blockNumber: data.blockNumber,
                    source: data.source,
                    rateLimited: !!data.rateLimited,
                    // Preserve cached workspace data to avoid N+1 query on retry
                    cachedWorkspace: data.cachedWorkspace
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

        // Load L2 configs if needed for orbit/OP processing
        if (hasCachedWorkspace) {
            // Check if cached workspace has L2 data from batchBlockSync
            const hasCachedL2Data = (
                'orbitConfig' in data.cachedWorkspace ||
                'orbitChildConfigs' in data.cachedWorkspace ||
                'opChildConfigs' in data.cachedWorkspace
            );

            if (hasCachedL2Data) {
                // Use cached L2 configs from batchBlockSync instead of querying database
                if (data.cachedWorkspace.orbitConfig) {
                    workspace.orbitConfig = require('../models').OrbitChainConfig.build(
                        data.cachedWorkspace.orbitConfig,
                        { isNewRecord: false }
                    );

                    // Set up parentWorkspace if available in cached data
                    if (data.cachedWorkspace.orbitConfig.parentWorkspace) {
                        workspace.orbitConfig.parentWorkspace = Workspace.build(
                            data.cachedWorkspace.orbitConfig.parentWorkspace,
                            { isNewRecord: false }
                        );
                    }
                }

                if (data.cachedWorkspace.orbitChildConfigs) {
                    workspace.orbitChildConfigs = data.cachedWorkspace.orbitChildConfigs.map(config =>
                        require('../models').OrbitChainConfig.build(config, { isNewRecord: false })
                    );
                }

                if (data.cachedWorkspace.opChildConfigs) {
                    workspace.opChildConfigs = data.cachedWorkspace.opChildConfigs.map(config =>
                        OpChainConfig.build(config, { isNewRecord: false })
                    );
                }
            } else if (data.cachedWorkspace.hasL2Configs === undefined) {
                // Only fall back to DB for old jobs that predate L2 config caching
                const l2Configs = await Workspace.findByPk(data.workspaceId, {
                    attributes: ['id'],
                    include: [
                        {
                            model: require('../models').OrbitChainConfig,
                            as: 'orbitConfig',
                            attributes: [
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
                            ],
                            required: false,
                            include: {
                                model: require('../models').Workspace,
                                as: 'parentWorkspace',
                                attributes: ['id', 'rpcServer'],
                                required: false
                            }
                        },
                        {
                            model: require('../models').OrbitChainConfig,
                            as: 'orbitChildConfigs',
                            attributes: [
                                'workspaceId',
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
                            ],
                            required: false
                        },
                        {
                            model: require('../models').OpChainConfig,
                            as: 'opChildConfigs',
                            attributes: ['workspaceId', 'batchInboxAddress', 'beaconUrl', 'l2BlockTime', 'l2GenesisTimestamp'],
                            required: false
                        }
                    ]
                });

                if (l2Configs) {
                    workspace.orbitConfig = l2Configs.orbitConfig;
                    workspace.orbitChildConfigs = l2Configs.orbitChildConfigs;
                    workspace.opChildConfigs = l2Configs.opChildConfigs;
                }
            }
            // If hasL2Configs is false, skip L2 config loading entirely
        }

        // Set orbit child configs after potential L2 config loading
        let orbitChildConfigs = workspace.orbitChildConfigs || [];


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

        const syncedBlock = await workspace.safeCreatePartialBlock(processedBlock);
        if (!syncedBlock)
            return "Couldn't store block";

        // OP Stack batch detection - enqueue as separate jobs to avoid blocking sync
        let opChildConfigs = workspace.opChildConfigs || [];

        // L2 configs are pre-loaded from batchBlockSync cache above when using cached workspace

        if (opChildConfigs.length > 0) {
            const l1Timestamp = typeof processedBlock.timestamp === 'string' && processedBlock.timestamp.startsWith('0x')
                ? parseInt(processedBlock.timestamp, 16)
                : Number(processedBlock.timestamp);

            // Create hash map of synced transactions for O(1) lookup to avoid O(n²) performance regression
            const transactionHashMap = new Map();
            for (const tx of syncedBlock.transactions) {
                transactionHashMap.set(tx.hash, tx);
            }

            const opBatchJobs = [];
            for (const opConfig of opChildConfigs) {
                if (!opConfig.batchInboxAddress) continue;

                const batchTxs = processedBlock.transactions.filter(tx =>
                    isBatchTransaction(tx, opConfig.batchInboxAddress)
                );

                for (const tx of batchTxs) {
                    const l1Transaction = transactionHashMap.get(tx.hash);
                    opBatchJobs.push({
                        name: `processOpBatch-${opConfig.workspaceId}-${tx.hash}`,
                        data: {
                            tx: { hash: tx.hash, timestamp: tx.timestamp, from: tx.from, to: tx.to, input: tx.input, blockNumber: tx.blockNumber, transactionIndex: tx.transactionIndex },
                            opConfigWorkspaceId: opConfig.workspaceId,
                            batchInboxAddress: opConfig.batchInboxAddress,
                            beaconUrl: opConfig.beaconUrl,
                            l2BlockTime: opConfig.l2BlockTime || 2,
                            l2GenesisTimestamp: opConfig.l2GenesisTimestamp,
                            l1Timestamp,
                            l1TransactionId: l1Transaction ? l1Transaction.id : null
                        }
                    });
                }
            }

            if (opBatchJobs.length > 0)
                await bulkEnqueue('processOpBatch', opBatchJobs);
        }

        const transactions = syncedBlock.transactions;

        // For blocks with few transactions, fetch receipts inline for lower latency
        // Only for public workspaces - private workspaces should go through receiptSync which enforces access control
        if (transactions.length > 0 && transactions.length <= INLINE_RECEIPT_THRESHOLD && workspace.public) {
            try {
                // Fetch all receipts in a single batch RPC request
                const receipts = await providerConnector.fetchTransactionReceiptsBatch(
                    transactions.map(tx => tx.hash)
                );

                // Ensure orbit associations are set for safeCreateReceipt
                workspace.orbitChildConfigs = orbitChildConfigs;

                // Store receipts in parallel with concurrency limit
                const failedTxHashes = [];
                for (let i = 0; i < transactions.length; i += RECEIPT_STORAGE_CONCURRENCY) {
                    const batch = transactions.slice(i, i + RECEIPT_STORAGE_CONCURRENCY);
                    await Promise.all(batch.map(async (tx, j) => {
                        const receiptIndex = i + j;
                        const receipt = receipts[receiptIndex];
                        if (!receipt) {
                            failedTxHashes.push(tx);
                            return;
                        }
                        const processedReceipt = processRawRpcObject(
                            receipt,
                            Object.keys(TransactionReceipt.rawAttributes).concat(['logs'])
                        );
                        processedReceipt.workspace = workspace;
                        try {
                            await tx.safeCreateReceipt(processedReceipt, { skipExistenceCheck: true });
                        } catch (err) {
                            logger.error(`Failed to store receipt for ${tx.hash}`, { location: 'jobs.blockSync.inlineReceipt', error: err.message, hash: tx.hash });
                            failedTxHashes.push(tx);
                        }
                    }));
                }

                // Queue receiptSync jobs for any that failed inline
                if (failedTxHashes.length > 0) {
                    const failedJobs = failedTxHashes.map(tx => ({
                        name: `receiptSync-${workspace.id}-${tx.hash}`,
                        data: {
                            transactionId: tx.id,
                            transactionHash: tx.hash,
                            workspaceId: workspace.id,
                            source: data.source,
                            rateLimited: data.rateLimited
                        }
                    }));
                    await bulkEnqueue('receiptSync', failedJobs, job.opts.priority);
                }
            } catch (error) {
                // Batch fetch failed entirely - fall back to queueing receiptSync jobs
                logger.warn('Inline receipt fetch failed, falling back to receiptSync jobs', { error: error.message });
                const fallbackJobs = transactions.map(tx => ({
                    name: `receiptSync-${workspace.id}-${tx.hash}`,
                    data: {
                        transactionId: tx.id,
                        transactionHash: tx.hash,
                        workspaceId: workspace.id,
                        source: data.source,
                        rateLimited: data.rateLimited
                    }
                }));
                await bulkEnqueue('receiptSync', fallbackJobs, job.opts.priority);
            }
        } else if (transactions.length > 0) {
            // For larger blocks (or private workspaces), queue jobs
            // Skip caching for orbit workspaces since they need full workspace context for receipt processing
            const hasOrbitConfig = !!(workspace.orbitConfig || orbitChildConfigs.length > 0);

            const jobs = [];
            for (let i = 0; i < transactions.length; i++) {
                const transaction = transactions[i];
                const jobData = {
                    transactionId: transaction.id,
                    transactionHash: transaction.hash,
                    workspaceId: workspace.id,
                    source: data.source,
                    rateLimited: data.rateLimited
                };

                // Only cache workspace data for non-orbit workspaces
                if (!hasOrbitConfig) {
                    jobData.cachedWorkspace = {
                        rpcServer: workspace.rpcServer,
                        rateLimitInterval: workspace.rateLimitInterval,
                        rateLimitMaxInInterval: workspace.rateLimitMaxInInterval,
                        public: workspace.public
                    };
                }

                jobs.push({
                    name: `receiptSync-${workspace.id}-${transaction.hash}`,
                    data: jobData
                });
            }
            await bulkEnqueue('receiptSync', jobs, job.opts.priority);
        }

        return 'Block synced';
    } catch(error) {
        logger.error(error.message, { location: 'jobs.blockSync', error, data });
        throw error;
    }
};
