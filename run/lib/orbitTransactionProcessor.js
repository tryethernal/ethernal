const { OrbitTransactionState, OrbitBatch } = require('../models');
const { ethers } = require('ethers');
const { getOrbitConfig } = require('./orbitConfig');
const { ProductionRpcClient, BatchDataParser } = require('./orbitRetry');
const logger = require('./logger');

// Basic ABIs for Orbit contracts - these would need to be more complete in production
const SEQUENCER_INBOX_ABI = [
    'event SequencerBatchDelivered(uint256 indexed batchSequenceNumber, bytes32 indexed beforeAcc, bytes32 indexed afterAcc, bytes32 delayedAcc, uint256 afterDelayedMessagesRead, tuple(uint64,uint64,uint64,uint64) timeBounds, uint8 dataLocation)',
    'function batchCount() external view returns (uint256)',
    'function batchInboxAccs(uint256) external view returns (bytes32)'
];

const ROLLUP_ABI = [
    'event NodeCreated(uint64 indexed nodeNum, bytes32 indexed parentNodeHash, bytes32 indexed nodeHash, bytes32 executionHash, tuple(tuple(bytes32[2],uint64[2]) globalState, uint256 machineStatus) assertion, bytes32 afterInboxBatchAcc, bytes32 wasmModuleRoot, uint256 inboxMaxCount)',
    'event NodeConfirmed(uint64 indexed nodeNum, bytes32 blockHash, bytes32 sendRoot)',
    'function latestConfirmed() external view returns (uint64)',
    'function getNode(uint64 nodeNum) external view returns (tuple(bytes32,uint64,uint64,bytes32,bytes32,bytes32,uint64,bytes32) node)'
];

const BRIDGE_ABI = [
    'event MessageDelivered(uint256 indexed messageIndex, bytes32 indexed beforeInboxAcc, address inbox, uint8 kind, address sender, bytes32 messageDataHash, uint256 baseFeeL1, uint64 timestamp)',
    'function sequencerInboxAccs(uint256) external view returns (bytes32)',
    'function delayedInboxAccs(uint256) external view returns (bytes32)'
];

class OrbitTransactionProcessor {
    constructor(transaction) {
        this.transaction = transaction;
        this.workspace = transaction.workspace;
        this.orbitConfig = transaction.workspace.orbitConfig || transaction.orbitConfig;
        
        // Two different providers for different purposes:
        // 1. Orbit chain provider - for transaction submission and orbit chain queries
        this.orbitProvider = this.workspace.getProvider().provider;
        // 2. Parent chain provider - for infrastructure contract monitoring
        this.parentProvider = this.orbitConfig.getParentChainProvider();
        
        this.config = getOrbitConfig();
        
        // Initialize production-grade RPC clients (all use parent chain provider)
        this.sequencerInbox = null;
        this.rollup = null;
        this.bridge = null;
        
        // Initialize batch parser
        this.batchParser = new BatchDataParser();
        
        // Metrics tracking
        this.metrics = {
            startTime: Date.now(),
            stateTransitions: 0,
            rpcCalls: 0,
            errors: 0
        };
        
        // Context for logging
        this.context = {
            transactionId: this.transaction.id,
            transactionHash: this.transaction.hash,
            workspaceId: this.workspace.id,
            chainType: this.orbitConfig.chainType,
            parentChainId: this.orbitConfig.parentChainId,
            orbitChainRpc: this.workspace.rpcServer,
            parentChainRpc: this.orbitConfig.parentChainRpcServer
        };
        
        logger.info('OrbitTransactionProcessor initialized with dual-chain architecture', this.context);
    }

    /**
     * Main processing method - determines current state and attempts to advance it
     */
    async process() {
        try {
            // Get or create orbit transaction state
            let orbitState = await OrbitTransactionState.findOne({
                where: { transactionId: this.transaction.id }
            });

            if (!orbitState) {
                orbitState = await this.createInitialState();
            }

            // Process state transitions based on current state
            await this.processStateTransition(orbitState);
            
            return orbitState;
        } catch (error) {
            console.error(`Error processing orbit transaction ${this.transaction.hash}:`, error);
            throw error;
        }
    }

    /**
     * Create initial state for a transaction
     */
    async createInitialState() {
        return OrbitTransactionState.create({
            transactionId: this.transaction.id,
            workspaceId: this.workspace.id,
            currentState: 'SUBMITTED',
            submittedAt: this.transaction.timestamp,
            submittedBlockNumber: this.transaction.blockNumber,
            submittedTxHash: this.transaction.hash
        });
    }

    /**
     * Process state transitions based on current state
     */
    async processStateTransition(orbitState) {
        switch (orbitState.currentState) {
            case 'SUBMITTED':
                await this.checkSequenced(orbitState);
                break;
            case 'SEQUENCED':
                await this.checkPosted(orbitState);
                break;
            case 'POSTED':
                await this.checkConfirmed(orbitState);
                break;
            case 'CONFIRMED':
                await this.checkFinalized(orbitState);
                break;
            case 'FINALIZED':
            case 'FAILED':
                // Nothing to do for final states
                break;
        }
    }

    /**
     * Check if transaction has been sequenced (included in a sequencer batch)
     */
    async checkSequenced(orbitState) {
        const methodContext = { ...this.context, method: 'checkSequenced', currentState: orbitState.currentState };
        
        try {
            logger.debug('Checking if transaction is sequenced', methodContext);
            
            const sequencerInbox = await this.getSequencerInboxContract();
            
            // Get current batch count with production error handling
            const currentBatchCount = await sequencerInbox.call('batchCount');
            logger.debug('Retrieved current batch count', { ...methodContext, currentBatchCount: currentBatchCount.toString() });
            
            // Look for SequencerBatchDelivered events from when transaction was submitted
            // Use reasonable block range to avoid RPC provider limits
            const currentBlock = await this.parentProvider.getBlockNumber();
            const fromBlock = Math.max(0, Number(orbitState.submittedBlockNumber) - 10);
            const maxToBlock = Math.min(
                currentBlock,
                fromBlock + this.config.MAX_BLOCKS_TO_SEARCH
            );
            
            const events = await this.queryEventsWithChunking(
                sequencerInbox, 
                'SequencerBatchDelivered', 
                fromBlock, 
                maxToBlock
            );
            logger.debug('Retrieved sequencer batch events', { 
                ...methodContext, 
                eventCount: events.length, 
                fromBlock, 
                toBlock: maxToBlock,
                currentBlock 
            });
            
            if (events.length === 0) {
                logger.debug('No sequencer batch events found yet', methodContext);
                return;
            }
            
            // Process and index all discovered batches
            await this.processBatchEvents(events, methodContext);
            
            // Check each batch for our transaction
            for (const event of events.slice(-10)) { // Check last 10 batches for efficiency
                const batchNumber = event.args.batchSequenceNumber;
                
                try {
                    const isIncluded = await this.checkTransactionInBatch(batchNumber, this.transaction.hash);
                    
                    if (isIncluded) {
                        logger.info('Transaction found in sequencer batch', { 
                            ...methodContext, 
                            batchNumber: batchNumber.toString(),
                            blockNumber: event.blockNumber
                        });
                        
                        await orbitState.updateState('SEQUENCED', {
                            sequenced: {
                                batchSequenceNumber: batchNumber.toString(),
                                afterAcc: event.args.afterAcc,
                                blockNumber: event.blockNumber,
                                transactionHash: event.transactionHash,
                                verifiedAt: new Date().toISOString()
                            }
                        });
                        
                        await orbitState.setStateDetails('SEQUENCED', event.blockNumber);
                        this.metrics.stateTransitions++;
                        return;
                    }
                } catch (batchError) {
                    logger.warn('Failed to check batch data', { 
                        ...methodContext, 
                        batchNumber: batchNumber.toString(),
                        error: batchError.message 
                    });
                    // Continue checking other batches
                }
            }
            
            // Check if we've exceeded the sequencing timeout
            const timeSinceSubmitted = Date.now() - new Date(orbitState.submittedAt);
            if (timeSinceSubmitted > this.config.SEQUENCING_TIMEOUT) {
                const errorMsg = `Transaction not sequenced within timeout (${this.config.SEQUENCING_TIMEOUT}ms)`;
                logger.error(errorMsg, methodContext);
                await orbitState.markAsFailed(errorMsg);
                this.metrics.errors++;
            } else {
                logger.debug('Transaction not yet sequenced, will retry later', { 
                    ...methodContext, 
                    timeSinceSubmitted,
                    timeoutRemaining: this.config.SEQUENCING_TIMEOUT - timeSinceSubmitted,
                    blocksSearched: maxToBlock - fromBlock + 1
                });
            }
            
        } catch (error) {
            this.metrics.errors++;
            logger.error('Error checking sequenced state', { ...methodContext, error: error.message });
            
            // Handle specific RPC provider errors gracefully
            if (error.message.includes('Circuit breaker')) {
                logger.warn('Circuit breaker open, will retry later', methodContext);
                return;
            }
            
            if (error.message.includes('block range') || error.message.includes('500 block')) {
                logger.warn('RPC provider block range limit encountered, will retry with smaller range', methodContext);
                return; // Don't mark as failed, will retry later
            }
            
            if (error.message.includes('rate limit') || error.message.includes('too many requests')) {
                logger.warn('RPC provider rate limit encountered, will retry later', methodContext);
                return; // Don't mark as failed, will retry later
            }
            
            if (error.code === 'NETWORK_ERROR' || error.code === 'SERVER_ERROR') {
                logger.warn('Network/server error, will retry later', { ...methodContext, errorCode: error.code });
                return; // Don't mark as failed, will retry later
            }
            
            // Only mark as failed for non-recoverable errors
            await orbitState.markAsFailed(`Failed to check sequenced state: ${error.message}`);
        }
    }

    /**
     * Check if batch containing transaction was posted to parent chain
     */
    async checkPosted(orbitState) {
        try {
            // In a real implementation, this would check parent chain for batch posting
            // For now, simulate progression after sequencing
            const timeThreshold = 15 * 60 * 1000; // 15 minutes
            const now = new Date();
            const timeSinceSequenced = now - new Date(orbitState.sequencedAt);
            
            if (timeSinceSequenced > timeThreshold) {
                await orbitState.updateState('POSTED', {
                    posted: {
                        // This would contain actual parent chain posting details
                        estimatedParentChainBlock: 'pending_real_implementation',
                        timestamp: now
                    }
                });
            }
        } catch (error) {
            console.error('Error checking posted state:', error);
            await orbitState.markAsFailed(`Failed to check posted state: ${error.message}`);
        }
    }

    /**
     * Check if assertion containing transaction was confirmed
     */
    async checkConfirmed(orbitState) {
        try {
            const rollup = await this.getRollupContract();
            
            // Get latest confirmed node
            const latestConfirmed = await rollup.latestConfirmed();
            
            // In a real implementation, we would:
            // 1. Map our batch to the corresponding rollup assertion/node
            // 2. Check if that node has been confirmed
            
            // For now, simulate based on confirmation period
            const confirmationPeriod = this.orbitConfig.confirmationPeriodBlocks * 12000; // ~12s per block
            const now = new Date();
            const timeSincePosted = now - new Date(orbitState.postedAt);
            
            if (timeSincePosted > confirmationPeriod) {
                await orbitState.updateState('CONFIRMED', {
                    confirmed: {
                        latestConfirmedNode: latestConfirmed.toString(),
                        timestamp: now
                    }
                });
            }
        } catch (error) {
            console.error('Error checking confirmed state:', error);
            await orbitState.markAsFailed(`Failed to check confirmed state: ${error.message}`);
        }
    }

    /**
     * Check if transaction is finalized (challenge period expired)
     */
    async checkFinalized(orbitState) {
        try {
            // Challenge period for finalization (typically 7 days)
            const challengePeriod = 7 * 24 * 60 * 60 * 1000; // 7 days
            const now = new Date();
            const timeSinceConfirmed = now - new Date(orbitState.confirmedAt);
            
            if (timeSinceConfirmed > challengePeriod) {
                await orbitState.updateState('FINALIZED', {
                    finalized: {
                        finalizedAt: now,
                        challengePeriodExpired: true
                    }
                });
            }
        } catch (error) {
            console.error('Error checking finalized state:', error);
            await orbitState.markAsFailed(`Failed to check finalized state: ${error.message}`);
        }
    }

    /**
     * Process and index batch events discovered during sequencer monitoring
     */
    async processBatchEvents(events, methodContext) {
        if (events.length === 0) return;
        
        logger.debug('Processing batch events for indexing', { 
            ...methodContext, 
            eventCount: events.length 
        });
        
        for (const event of events) {
            try {
                await this.indexBatch(event, methodContext);
            } catch (error) {
                logger.warn('Failed to index batch', { 
                    ...methodContext, 
                    batchNumber: event.args.batchSequenceNumber.toString(),
                    error: error.message 
                });
                // Continue processing other batches
            }
        }
    }
    
    /**
     * Index a single batch in the database
     */
    async indexBatch(event, methodContext) {
        const batchSequenceNumber = event.args.batchSequenceNumber;
        const batchContext = { 
            ...methodContext, 
            batchNumber: batchSequenceNumber.toString() 
        };
        
        try {
            // Check if batch already exists
            const existingBatch = await OrbitBatch.findOne({
                where: {
                    workspaceId: this.workspace.id,
                    batchSequenceNumber: batchSequenceNumber
                }
            });
            
            if (existingBatch) {
                logger.debug('Batch already indexed', batchContext);
                return existingBatch;
            }
            
            // Get additional batch information
            const [block, transaction] = await Promise.all([
                this.parentProvider.getBlock(event.blockNumber),
                this.parentProvider.getTransaction(event.transactionHash)
            ]);
            
            const batchData = {
                workspaceId: this.workspace.id,
                batchSequenceNumber: batchSequenceNumber,
                parentChainBlockNumber: event.blockNumber,
                parentChainTxHash: event.transactionHash,
                parentChainTxIndex: event.transactionIndex,
                postedAt: new Date(block.timestamp * 1000),
                beforeAcc: event.args.beforeAcc,
                afterAcc: event.args.afterAcc,
                delayedAcc: event.args.delayedAcc,
                l1GasUsed: transaction.gasUsed,
                l1GasPrice: transaction.gasPrice?.toString(),
                l1Cost: transaction.gasUsed && transaction.gasPrice ? 
                    (BigInt(transaction.gasUsed) * BigInt(transaction.gasPrice)).toString() : null,
                metadata: {
                    timeBounds: event.args.timeBounds,
                    dataLocation: this.getDataLocationFromEvent(event),
                    discoveredAt: new Date().toISOString(),
                    indexedBy: 'orbitTransactionProcessor'
                }
            };
            
            // Try to determine transaction count and batch size
            const batchMetrics = await this.getBatchMetrics(event, batchContext);
            if (batchMetrics) {
                batchData.transactionCount = batchMetrics.transactionCount;
                batchData.batchSize = batchMetrics.batchSize;
                batchData.batchDataHash = batchMetrics.batchDataHash;
                batchData.batchDataLocation = batchMetrics.dataLocation;
            }
            
            const batch = await OrbitBatch.create(batchData);
            
            logger.info('Successfully indexed new batch', { 
                ...batchContext, 
                id: batch.id,
                transactionCount: batch.transactionCount
            });
            
            return batch;
            
        } catch (error) {
            if (error.name === 'SequelizeUniqueConstraintError') {
                // Race condition - batch was created by another process
                logger.debug('Batch already indexed (race condition)', batchContext);
                return await OrbitBatch.findOne({
                    where: {
                        workspaceId: this.workspace.id,
                        batchSequenceNumber: batchSequenceNumber
                    }
                });
            }
            
            logger.error('Failed to index batch', { 
                ...batchContext, 
                error: error.message 
            });
            throw error;
        }
    }
    
    /**
     * Get batch metrics (transaction count, size, etc.)
     */
    async getBatchMetrics(event, batchContext) {
        try {
            // For now, return basic information
            // In a full implementation, this would parse batch data to count transactions
            const dataLocation = this.getDataLocationFromEvent(event);
            
            return {
                transactionCount: 0, // Will be updated later when we parse batch data
                batchSize: null,
                batchDataHash: null,
                dataLocation: dataLocation
            };
        } catch (error) {
            logger.warn('Failed to get batch metrics', { 
                ...batchContext, 
                error: error.message 
            });
            return null;
        }
    }
    
    /**
     * Determine data location from batch event
     */
    getDataLocationFromEvent(event) {
        // Arbitrum batch data location logic
        // 0 = onchain, 1 = DAS (Data Availability Service), etc.
        const dataLocation = event.args.dataLocation || 0;
        
        switch (dataLocation) {
            case 0: return 'onchain';
            case 1: return 'das';
            case 2: return 'ipfs';
            default: return 'onchain';
        }
    }

    /**
     * Check if a transaction is included in a specific batch
     */
    async checkTransactionInBatch(batchNumber, transactionHash) {
        const methodContext = { ...this.context, method: 'checkTransactionInBatch', batchNumber: batchNumber.toString() };
        
        try {
            logger.debug('Checking transaction in batch', methodContext);
            
            // In a real implementation, this would:
            // 1. Retrieve batch data from the sequencer inbox
            // 2. Parse the compressed batch data
            // 3. Check if the transaction hash is included
            
            // For now, we'll use the batch parser with simulated data
            // This is where you'd integrate with Arbitrum's actual batch data format
            const batchData = await this.getBatchData(batchNumber);
            const result = await this.batchParser.parseBatchData(batchData, transactionHash);
            
            logger.debug('Batch check completed', { ...methodContext, result });
            return result.isIncluded;
            
        } catch (error) {
            logger.warn('Failed to check transaction in batch', { ...methodContext, error: error.message });
            throw error;
        }
    }
    
    /**
     * Retrieve batch data for a given batch number
     */
    async getBatchData(batchNumber) {
        // This is a placeholder - real implementation would retrieve actual batch data
        // from the sequencer inbox contract or an indexer service
        
        logger.warn('getBatchData not fully implemented - using placeholder', { 
            batchNumber: batchNumber.toString() 
        });
        
        // Return empty data for now - this needs real implementation
        return Buffer.alloc(0);
    }
    
    /**
     * Query contract events with block range chunking to avoid RPC provider limits
     */
    async queryEventsWithChunking(contract, eventName, fromBlock, toBlock) {
        const methodContext = { 
            ...this.context, 
            method: 'queryEventsWithChunking', 
            contract: contract.contractAddress,
            eventName,
            fromBlock,
            toBlock 
        };
        
        try {
            logger.debug('Querying contract events with chunking', methodContext);
            
            const maxRangePerQuery = this.config.MAX_BLOCK_RANGE_PER_QUERY || 500;
            const allEvents = [];
            
            let currentFromBlock = fromBlock;
            
            while (currentFromBlock <= toBlock) {
                const currentToBlock = Math.min(currentFromBlock + maxRangePerQuery - 1, toBlock);
                
                const chunkContext = {
                    ...methodContext,
                    chunkFromBlock: currentFromBlock,
                    chunkToBlock: currentToBlock,
                    chunkSize: currentToBlock - currentFromBlock + 1
                };
                
                logger.debug('Querying chunk', chunkContext);
                
                try {
                    const chunkEvents = await this.queryEvents(contract, eventName, currentFromBlock, currentToBlock);
                    allEvents.push(...chunkEvents);
                    
                    logger.debug('Chunk queried successfully', { 
                        ...chunkContext, 
                        eventCount: chunkEvents.length 
                    });
                    
                } catch (chunkError) {
                    // If a chunk fails, log it but continue with next chunk
                    logger.warn('Chunk query failed', { 
                        ...chunkContext, 
                        error: chunkError.message 
                    });
                    
                    // If it's a rate limit or range error, respect the suggested range from the error
                    if (chunkError.message.includes('block range') || chunkError.message.includes('500 block')) {
                        logger.warn('Reducing chunk size due to RPC provider limits', chunkContext);
                        // Reduce chunk size and retry
                        const smallerRange = Math.min(100, maxRangePerQuery / 2);
                        const smallerToBlock = Math.min(currentFromBlock + smallerRange - 1, toBlock);
                        
                        try {
                            const retryEvents = await this.queryEvents(contract, eventName, currentFromBlock, smallerToBlock);
                            allEvents.push(...retryEvents);
                            currentFromBlock = smallerToBlock + 1;
                            continue;
                        } catch (retryError) {
                            logger.error('Retry with smaller chunk also failed', { 
                                ...chunkContext, 
                                retryError: retryError.message 
                            });
                        }
                    }
                }
                
                currentFromBlock = currentToBlock + 1;
                
                // Add small delay between chunks to be nice to RPC providers
                if (currentFromBlock <= toBlock) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
            
            logger.debug('All chunks queried successfully', { 
                ...methodContext, 
                totalEvents: allEvents.length,
                chunksProcessed: Math.ceil((toBlock - fromBlock + 1) / maxRangePerQuery)
            });
            
            return allEvents;
            
        } catch (error) {
            logger.error('Failed to query events with chunking', { ...methodContext, error: error.message });
            throw error;
        }
    }

    /**
     * Query contract events with production error handling
     */
    async queryEvents(contract, eventName, fromBlock, toBlock) {
        const methodContext = { 
            ...this.context, 
            method: 'queryEvents', 
            contract: contract.contractAddress,
            eventName,
            fromBlock,
            toBlock 
        };
        
        try {
            logger.debug('Querying contract events', methodContext);
            
            // Use the underlying ethers contract for event queries
            // as our ProductionRpcClient is designed for method calls
            // Use parent provider since infrastructure contracts are on parent chain
            const ethersContract = new ethers.Contract(
                contract.contractAddress,
                contract.abi,
                this.parentProvider
            );
            
            const filter = ethersContract.filters[eventName]();
            const events = await ethersContract.queryFilter(filter, fromBlock, toBlock);
            
            logger.debug('Events retrieved successfully', { 
                ...methodContext, 
                eventCount: events.length 
            });
            
            return events;
            
        } catch (error) {
            logger.error('Failed to query events', { ...methodContext, error: error.message });
            throw error;
        }
    }

    /**
     * Get sequencer inbox contract instance
     */
    async getSequencerInboxContract() {
        if (!this.sequencerInbox) {
            this.sequencerInbox = new ProductionRpcClient(
                this.parentProvider, // Use parent chain provider
                this.orbitConfig.sequencerInboxContract,
                SEQUENCER_INBOX_ABI,
                'SequencerInbox'
            );
        }
        return this.sequencerInbox;
    }

    /**
     * Get rollup contract instance
     */
    async getRollupContract() {
        if (!this.rollup) {
            this.rollup = new ProductionRpcClient(
                this.parentProvider, // Use parent chain provider
                this.orbitConfig.rollupContract,
                ROLLUP_ABI,
                'Rollup'
            );
        }
        return this.rollup;
    }

    /**
     * Get bridge contract instance
     */
    async getBridgeContract() {
        if (!this.bridge) {
            this.bridge = new ProductionRpcClient(
                this.parentProvider, // Use parent chain provider
                this.orbitConfig.bridgeContract,
                BRIDGE_ABI,
                'Bridge'
            );
        }
        return this.bridge;
    }

    /**
     * Validate that all required contracts are accessible
     */
    async validateContracts() {
        const methodContext = { ...this.context, method: 'validateContracts' };
        
        try {
            logger.info('Validating orbit contracts', methodContext);
            
            const sequencerInbox = await this.getSequencerInboxContract();
            const rollup = await this.getRollupContract();
            const bridge = await this.getBridgeContract();

            // Basic validation calls with production error handling
            await sequencerInbox.call('batchCount');
            await rollup.call('latestConfirmed');

            // Get health checks for all contracts
            const healthChecks = await Promise.all([
                sequencerInbox.healthCheck(),
                rollup.healthCheck(),
                bridge.healthCheck()
            ]);

            const allHealthy = healthChecks.every(check => check.healthy);

            if (!allHealthy) {
                const unhealthyContracts = healthChecks
                    .filter(check => !check.healthy)
                    .map(check => check.error)
                    .join(', ');
                throw new Error(`Some contracts are unhealthy: ${unhealthyContracts}`);
            }

            logger.info('All orbit contracts validated successfully', { 
                ...methodContext, 
                healthChecks: healthChecks.map(check => ({ 
                    healthy: check.healthy, 
                    contractDeployed: check.contractDeployed 
                }))
            });
            
            return true;
        } catch (error) {
            console.log('error', error);
            logger.error('Contract validation failed', { ...methodContext, error: error.message });
            throw new Error(`Contract validation failed: ${error.message}`);
        }
    }

    /**
     * Get contract addresses for debugging
     */
    getContractAddresses() {
        return {
            rollup: this.orbitConfig.rollupContract,
            bridge: this.orbitConfig.bridgeContract,
            sequencerInbox: this.orbitConfig.sequencerInboxContract,
            inbox: this.orbitConfig.inboxContract,
            outbox: this.orbitConfig.outboxContract
        };
    }
}

module.exports = OrbitTransactionProcessor;