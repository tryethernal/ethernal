const { ProviderConnector } = require('../lib/rpc');
const { Workspace, Explorer, StripeSubscription, RpcHealthCheck, IntegrityCheck, Block, OrbitChainConfig, TransactionReceipt } = require('../models');
const db = require('../lib/firebase');
const logger = require('../lib/logger');
const { processRawRpcObject } = require('../lib/utils');
const { enqueue, bulkEnqueue } = require('../lib/queue');
const RateLimiter = require('../lib/rateLimiter');
const constants = require('../constants/orbit');

// Threshold for inline receipt fetching vs job queueing
const INLINE_RECEIPT_THRESHOLD = 10;
// Concurrency limit for parallel receipt storage
const RECEIPT_STORAGE_CONCURRENCY = 5;

module.exports = async job => {
    const data = job.data;

    if (!data.userId || !data.workspace || data.blockNumber === undefined || data.blockNumber === null)
        return 'Missing parameter';

    const workspace = await Workspace.findOne({
        where: {
            name: data.workspace,
            '$user.firebaseUserId$': data.userId
        },
        include: [
            'user',
            'orbitConfig',
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

        const syncedBlock = await workspace.safeCreatePartialBlock(processedBlock);
        if (!syncedBlock)
            return "Couldn't store block";

        const transactions = syncedBlock.transactions;

        // For blocks with few transactions, fetch receipts inline for lower latency
        // Only for public workspaces - private workspaces should go through receiptSync which enforces access control
        if (transactions.length > 0 && transactions.length <= INLINE_RECEIPT_THRESHOLD && workspace.public) {
            // Fetch all receipts in a single batch RPC request
            const receipts = await providerConnector.fetchTransactionReceiptsBatch(
                transactions.map(tx => tx.hash)
            );

            // Store receipts in parallel with concurrency limit
            for (let i = 0; i < transactions.length; i += RECEIPT_STORAGE_CONCURRENCY) {
                const batch = transactions.slice(i, i + RECEIPT_STORAGE_CONCURRENCY);
                await Promise.all(batch.map((tx, j) => {
                    const receiptIndex = i + j;
                    const receipt = receipts[receiptIndex];
                    if (!receipt) {
                        logger.warn(`Missing receipt for transaction ${tx.hash}`);
                        return Promise.resolve();
                    }
                    const processedReceipt = processRawRpcObject(
                        receipt,
                        Object.keys(TransactionReceipt.rawAttributes).concat(['logs'])
                    );
                    processedReceipt.workspace = workspace;
                    return tx.safeCreateReceipt(processedReceipt).catch(err => {
                        logger.error(`Failed to store receipt for ${tx.hash}`, { error: err.message });
                    });
                }));
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
        console.log(error);
        logger.error(error.message, { location: 'jobs.blockSync', error, data });
        throw error;
    }
};
