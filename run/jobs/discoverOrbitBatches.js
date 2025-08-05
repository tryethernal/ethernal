const { OrbitBatch, OrbitChainConfig, sequelize } = require('../models');
const { getOrbitConfig } = require('../lib/orbitConfig');
const { ProductionRpcClient } = require('../lib/orbitRetry');
const logger = require('../lib/logger');
const { ethers } = require('ethers');

// Sequencer Inbox ABI for batch discovery
const SEQUENCER_INBOX_ABI = [
    'function batchCount() external view returns (uint256)',
    'function inboxAccs(uint256) external view returns (bytes32)',
    'function sequencerBridge() external view returns (address)',
    'event SequencerBatchDelivered(uint256 indexed batchSequenceNumber, bytes32 indexed beforeAcc, bytes32 indexed afterAcc, bytes32 delayedAcc, uint256 afterDelayedMessagesRead, tuple(uint64 minTimestamp, uint64 maxTimestamp, uint64 minBlockNumber, uint64 maxBlockNumber) timeBounds, uint8 dataLocation, bytes data)'
];

/**
 * Dedicated job for discovering and indexing new orbit batches
 * Runs independently of transaction processing to ensure complete batch coverage
 */
async function discoverOrbitBatches(job) {
    const { workspaceId } = job.data;
    const config = getOrbitConfig();
    
    const jobContext = {
        job: 'discoverOrbitBatches',
        workspaceId,
        jobId: job.id
    };
    
    try {
        logger.info('Starting orbit batch discovery', jobContext);
        
        // Get orbit configuration for this workspace
        const orbitConfig = await OrbitChainConfig.findOne({
            where: { workspaceId }
        });
        
        if (!orbitConfig) {
            logger.debug('No orbit configuration found for workspace', jobContext);
            return { status: 'skipped', reason: 'no_orbit_config' };
        }
        
        // Get parent chain provider
        const parentProvider = new ethers.providers.JsonRpcProvider(orbitConfig.parentChainRpcServer);
        
        // Get sequencer inbox contract
        const sequencerInbox = new ProductionRpcClient(
            parentProvider,
            orbitConfig.sequencerInboxContract,
            SEQUENCER_INBOX_ABI,
            'SequencerInbox'
        );
        
        // Get current batch count from contract
        const currentBatchCount = await sequencerInbox.call('batchCount');
        const currentBatchNumber = currentBatchCount.toNumber();
        
        // Get latest indexed batch
        const latestIndexedBatch = await OrbitBatch.findOne({
            where: { workspaceId },
            order: [['batchSequenceNumber', 'DESC']],
            limit: 1
        });
        
        const lastIndexedNumber = latestIndexedBatch ? latestIndexedBatch.batchSequenceNumber : -1;
        const batchesToDiscover = currentBatchNumber - lastIndexedNumber - 1;
        
        logger.debug('Batch discovery analysis', {
            ...jobContext,
            currentBatchNumber,
            lastIndexedNumber,
            batchesToDiscover
        });
        
        if (batchesToDiscover <= 0) {
            return {
                status: 'completed',
                reason: 'no_new_batches',
                currentBatchNumber,
                lastIndexedNumber
            };
        }
        
        // Discover new batches
        const discoveryResult = await discoverNewBatches(
            orbitConfig,
            parentProvider,
            sequencerInbox,
            lastIndexedNumber + 1,
            currentBatchNumber,
            jobContext
        );
        
        const result = {
            status: 'completed',
            currentBatchNumber,
            lastIndexedNumber,
            batchesToDiscover,
            ...discoveryResult
        };
        
        logger.info('Completed orbit batch discovery', { ...jobContext, ...result });
        
        return result;
        
    } catch (error) {
        logger.error('Error in orbit batch discovery job', {
            ...jobContext,
            error: error.message
        });
        throw error;
    }
}

/**
 * Discover and index new batches in a given range
 */
async function discoverNewBatches(orbitConfig, parentProvider, sequencerInbox, fromBatch, toBatch, jobContext) {
    try {
        const config = getOrbitConfig();
        
        // Get current block for event search range
        const currentBlock = await parentProvider.getBlockNumber();
        const searchFromBlock = Math.max(0, currentBlock - config.MAX_BLOCKS_TO_SEARCH);
        
        logger.debug('Searching for batch events', {
            ...jobContext,
            fromBatch,
            toBatch,
            searchFromBlock,
            currentBlock
        });
        
        // Query for SequencerBatchDelivered events
        const events = await queryBatchEventsWithChunking(
            parentProvider,
            orbitConfig.sequencerInboxContract,
            searchFromBlock,
            currentBlock,
            fromBatch,
            toBatch,
            jobContext
        );
        
        logger.debug('Found batch events', {
            ...jobContext,
            eventCount: events.length
        });
        
        let indexedBatches = 0;
        let updatedBatches = 0;
        const errors = [];
        
        // Process each event
        for (const event of events) {
            try {
                const batchNumber = event.args.batchSequenceNumber.toNumber();
                
                // Check if batch already exists
                const existingBatch = await OrbitBatch.findOne({
                    where: {
                        workspaceId: orbitConfig.workspaceId,
                        batchSequenceNumber: batchNumber
                    }
                });
                
                if (existingBatch) {
                    // Update existing batch with any new information
                    const updated = await updateExistingBatch(existingBatch, event, parentProvider, jobContext);
                    if (updated) updatedBatches++;
                } else {
                    // Index new batch
                    await indexNewBatch(orbitConfig, event, parentProvider, jobContext);
                    indexedBatches++;
                }
                
            } catch (error) {
                const errorInfo = {
                    batchNumber: event.args.batchSequenceNumber.toString(),
                    error: error.message
                };
                errors.push(errorInfo);
                
                logger.error('Error processing batch event', {
                    ...jobContext,
                    ...errorInfo
                });
            }
        }
        
        // Handle missing batches (batches that should exist but weren't found in events)
        const missingBatches = await handleMissingBatches(
            orbitConfig,
            fromBatch,
            toBatch,
            events,
            jobContext
        );
        
        return {
            eventsFound: events.length,
            batchesIndexed: indexedBatches,
            batchesUpdated: updatedBatches,
            missingBatches: missingBatches,
            errors: errors.length,
            errorDetails: errors
        };
        
    } catch (error) {
        logger.error('Error discovering new batches', {
            ...jobContext,
            error: error.message
        });
        throw error;
    }
}

/**
 * Query batch events with block range chunking
 */
async function queryBatchEventsWithChunking(parentProvider, contractAddress, fromBlock, toBlock, fromBatch, toBatch, jobContext) {
    const config = getOrbitConfig();
    const maxRangePerQuery = config.MAX_BLOCK_RANGE_PER_QUERY || 500;
    const allEvents = [];
    
    let currentFromBlock = fromBlock;
    
    while (currentFromBlock <= toBlock) {
        const currentToBlock = Math.min(currentFromBlock + maxRangePerQuery - 1, toBlock);
        
        try {
            const contract = new ethers.Contract(
                contractAddress,
                SEQUENCER_INBOX_ABI,
                parentProvider
            );
            
            const filter = contract.filters.SequencerBatchDelivered();
            const events = await contract.queryFilter(filter, currentFromBlock, currentToBlock);
            
            // Filter events for the batch range we're interested in
            const relevantEvents = events.filter(event => {
                const batchNum = event.args.batchSequenceNumber.toNumber();
                return batchNum >= fromBatch && batchNum < toBatch;
            });
            
            allEvents.push(...relevantEvents);
            
            logger.debug('Queried batch events chunk', {
                ...jobContext,
                chunkFrom: currentFromBlock,
                chunkTo: currentToBlock,
                eventsFound: events.length,
                relevantEvents: relevantEvents.length
            });
            
        } catch (error) {
            logger.warn('Failed to query batch events chunk', {
                ...jobContext,
                chunkFrom: currentFromBlock,
                chunkTo: currentToBlock,
                error: error.message
            });
        }
        
        currentFromBlock = currentToBlock + 1;
        
        // Small delay between chunks
        if (currentFromBlock <= toBlock) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    return allEvents;
}

/**
 * Index a new batch from an event
 */
async function indexNewBatch(orbitConfig, event, parentProvider, jobContext) {
    const batchSequenceNumber = event.args.batchSequenceNumber.toNumber();
    const batchContext = { ...jobContext, batchNumber: batchSequenceNumber };
    
    try {
        // Get block and transaction information
        const [block, transaction] = await Promise.all([
            parentProvider.getBlock(event.blockNumber),
            parentProvider.getTransaction(event.transactionHash)
        ]);
        
        // Get transaction receipt for gas information
        const receipt = await parentProvider.getTransactionReceipt(event.transactionHash);
        
        // Extract batch data
        const batchDataInfo = await extractBatchData(event, parentProvider, batchContext);
        
        const batchData = {
            workspaceId: orbitConfig.workspaceId,
            batchSequenceNumber: batchSequenceNumber,
            parentChainBlockNumber: event.blockNumber,
            parentChainTxHash: event.transactionHash,
            parentChainTxIndex: event.transactionIndex,
            postedAt: new Date(block.timestamp * 1000),
            beforeAcc: event.args.beforeAcc,
            afterAcc: event.args.afterAcc,
            delayedAcc: event.args.delayedAcc,
            l1GasUsed: receipt.gasUsed,
            l1GasPrice: transaction.gasPrice?.toString(),
            l1Cost: receipt.gasUsed && transaction.gasPrice ?
                (BigInt(receipt.gasUsed) * BigInt(transaction.gasPrice)).toString() : null,
            batchDataLocation: getDataLocationFromEvent(event),
            transactionCount: batchDataInfo.transactionCount,
            batchSize: batchDataInfo.batchSize,
            batchDataHash: batchDataInfo.dataHash,
            metadata: {
                timeBounds: {
                    minTimestamp: event.args.timeBounds.minTimestamp.toString(),
                    maxTimestamp: event.args.timeBounds.maxTimestamp.toString(),
                    minBlockNumber: event.args.timeBounds.minBlockNumber.toString(),
                    maxBlockNumber: event.args.timeBounds.maxBlockNumber.toString()
                },
                afterDelayedMessagesRead: event.args.afterDelayedMessagesRead.toString(),
                discoveredAt: new Date().toISOString(),
                indexedBy: 'discoverOrbitBatches',
                batchDataInfo: batchDataInfo
            }
        };
        
        const batch = await OrbitBatch.create(batchData);
        
        logger.info('Successfully indexed new batch', {
            ...batchContext,
            batchId: batch.id,
            transactionCount: batch.transactionCount,
            batchSize: batch.batchSize
        });
        
        return batch;
        
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            logger.debug('Batch already indexed (race condition)', batchContext);
            return null;
        }
        
        logger.error('Failed to index new batch', {
            ...batchContext,
            error: error.message
        });
        throw error;
    }
}

/**
 * Update existing batch with new information if needed
 */
async function updateExistingBatch(existingBatch, event, parentProvider, jobContext) {
    const batchContext = {
        ...jobContext,
        batchNumber: existingBatch.batchSequenceNumber,
        batchId: existingBatch.id
    };
    
    try {
        let updated = false;
        const updates = {};
        
        // Check if we need to update transaction count or batch data
        if (!existingBatch.transactionCount || existingBatch.transactionCount === 0) {
            const batchDataInfo = await extractBatchData(event, parentProvider, batchContext);
            
            if (batchDataInfo.transactionCount > 0) {
                updates.transactionCount = batchDataInfo.transactionCount;
                updates.batchSize = batchDataInfo.batchSize;
                updates.batchDataHash = batchDataInfo.dataHash;
                updates.metadata = {
                    ...existingBatch.metadata,
                    batchDataInfo: batchDataInfo,
                    updatedAt: new Date().toISOString()
                };
                updated = true;
            }
        }
        
        if (updated) {
            await existingBatch.update(updates);
            logger.info('Updated existing batch', {
                ...batchContext,
                updates: Object.keys(updates)
            });
        }
        
        return updated;
        
    } catch (error) {
        logger.error('Failed to update existing batch', {
            ...batchContext,
            error: error.message
        });
        return false;
    }
}

/**
 * Extract batch data and transaction information using enhanced parser
 */
async function extractBatchData(event, parentProvider, batchContext) {
    try {
        const ArbitrumBatchParser = require('../lib/arbitrumBatchParser');
        const parser = new ArbitrumBatchParser();
        
        const batchData = event.args.data;
        const dataLocation = event.args.dataLocation;
        
        logger.debug('Extracting batch data with enhanced parser', {
            ...batchContext,
            dataLocation,
            dataSize: batchData ? batchData.length : 0
        });
        
        // Use the enhanced parser
        const parseResult = await parser.parseBatchData(batchData, dataLocation, batchContext);
        
        // Add additional context from the event
        parseResult.eventMetadata = {
            beforeAcc: event.args.beforeAcc,
            afterAcc: event.args.afterAcc,
            delayedAcc: event.args.delayedAcc,
            timeBounds: {
                minTimestamp: event.args.timeBounds.minTimestamp.toString(),
                maxTimestamp: event.args.timeBounds.maxTimestamp.toString(),
                minBlockNumber: event.args.timeBounds.minBlockNumber.toString(),
                maxBlockNumber: event.args.timeBounds.maxBlockNumber.toString()
            },
            afterDelayedMessagesRead: event.args.afterDelayedMessagesRead.toString()
        };
        
        logger.debug('Enhanced batch data extraction completed', {
            ...batchContext,
            transactionCount: parseResult.transactionCount,
            blockCount: parseResult.blocks?.length || 0,
            parseMethod: parseResult.metadata?.parseMethod || 'unknown'
        });
        
        return parseResult;
        
    } catch (error) {
        logger.error('Failed to extract batch data with enhanced parser', {
            ...batchContext,
            error: error.message
        });
        
        // Fallback to basic extraction
        return {
            transactionCount: 0,
            batchSize: 0,
            dataHash: null,
            dataLocation: getDataLocationFromEvent(event),
            transactions: [],
            blocks: [],
            metadata: { parseError: error.message, parseMethod: 'fallback' }
        };
    }
}



/**
 * Handle batches that should exist but weren't found in events
 */
async function handleMissingBatches(orbitConfig, fromBatch, toBatch, foundEvents, jobContext) {
    try {
        const foundBatchNumbers = new Set(
            foundEvents.map(event => event.args.batchSequenceNumber.toNumber())
        );
        
        const missingBatches = [];
        
        for (let batchNum = fromBatch; batchNum < toBatch; batchNum++) {
            if (!foundBatchNumbers.has(batchNum)) {
                missingBatches.push(batchNum);
            }
        }
        
        if (missingBatches.length > 0) {
            logger.warn('Found missing batches - may need extended search', {
                ...jobContext,
                missingBatches: missingBatches.slice(0, 10), // Log first 10
                totalMissing: missingBatches.length
            });
        }
        
        return missingBatches.length;
        
    } catch (error) {
        logger.error('Error handling missing batches', {
            ...jobContext,
            error: error.message
        });
        return 0;
    }
}

/**
 * Determine data location from event
 */
function getDataLocationFromEvent(event) {
    const dataLocation = event.args.dataLocation || 0;
    
    switch (dataLocation) {
        case 0: return 'onchain';
        case 1: return 'das';
        case 2: return 'ipfs';
        default: return 'onchain';
    }
}

module.exports = discoverOrbitBatches;