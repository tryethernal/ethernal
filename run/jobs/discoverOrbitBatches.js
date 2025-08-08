const { OrbitBatch, OrbitChainConfig, sequelize } = require('../models');
const { getOrbitConfig } = require('../lib/orbitConfig');
const { ProductionRpcClient } = require('../lib/orbitRetry');
const { markJobCompleted } = require('../lib/orbitBatchQueue');
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
 * Uses batch-by-batch discovery instead of limited block range searches
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
            where: { workspaceId },
            include: [{ model: require('../models').Workspace, as: 'parentWorkspace', attributes: ['id', 'name'] }]
        });
        
        if (!orbitConfig) {
            logger.debug('No orbit configuration found for workspace', jobContext);
            return { status: 'skipped', reason: 'no_orbit_config' };
        }
        
        // Try DB-driven discovery if a parent workspace is configured
        const canUseParentWorkspace = !!orbitConfig.parentWorkspaceId;

        // Get latest indexed batch
        const latestIndexedBatch = await OrbitBatch.findOne({
            where: { workspaceId },
            order: [['batchSequenceNumber', 'DESC']],
            limit: 1
        });
        const lastIndexedNumber = latestIndexedBatch ? latestIndexedBatch.batchSequenceNumber : 0;

        if (canUseParentWorkspace) {
            const discoveryResult = await discoverBatchesFromIndexedLogs(orbitConfig, lastIndexedNumber + 1, jobContext);

            const result = { status: 'completed', strategy: 'indexed_logs', lastIndexedNumber, ...discoveryResult };
            logger.info('Completed orbit batch discovery (indexed logs)', { ...jobContext, ...result });
            markJobCompleted(workspaceId, job.id);
            return result;
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
        
        // keep lastIndexedNumber from above
        const batchesToDiscover = currentBatchNumber - lastIndexedNumber - 1;
        
        logger.info('Batch discovery analysis', {
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
        
        // Discover new batches using batch-by-batch approach
        const discoveryResult = await discoverBatchesByNumber(
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
        
        // Mark job as completed for rate limiting
        markJobCompleted(workspaceId, job.id);
        
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
 * Discover batches using indexed logs in the parent workspace to minimize RPC calls
 */
async function discoverBatchesFromIndexedLogs(orbitConfig, startFromBatch, jobContext) {
    const { TransactionLog, TransactionReceipt, Transaction, Block } = require('../models');
    const iface = new ethers.utils.Interface(SEQUENCER_INBOX_ABI);
    const eventFragment = iface.getEvent('SequencerBatchDelivered');
    const topic0 = iface.getEventTopic(eventFragment);

    // Query logs in the parent workspace ordered by blockNumber/logIndex for the sequencer inbox address
    const logs = await TransactionLog.findAll({
        where: {
            workspaceId: orbitConfig.parentWorkspaceId,
            address: orbitConfig.sequencerInboxContract.toLowerCase(),
            [sequelize.Op.and]: sequelize.where(
                sequelize.json('topics')[0],
                sequelize.Op.eq,
                topic0
            )
        },
        order: [ ['blockNumber', 'ASC'], ['logIndex', 'ASC'] ],
        attributes: ['id', 'workspaceId', 'address', 'data', 'topics', 'blockNumber', 'transactionHash', 'logIndex']
    });

    let indexedBatches = 0;
    let skippedBatches = 0;
    const errors = [];

    for (const log of logs) {
        try {
            const parsed = iface.parseLog({ topics: log.topics, data: log.data });
            const bn = parsed.args.batchSequenceNumber.toNumber();
            if (bn < startFromBatch) {
                skippedBatches++;
                continue;
            }

            // Avoid duplicates
            const exists = await OrbitBatch.findOne({
                where: { workspaceId: orbitConfig.workspaceId, batchSequenceNumber: bn }
            });
            if (exists) { skippedBatches++; continue; }

            // Fetch related data from local DB where possible
            const receipt = await TransactionReceipt.findOne({
                where: { workspaceId: orbitConfig.parentWorkspaceId, transactionHash: log.transactionHash },
                attributes: ['blockNumber', 'transactionIndex', 'gasUsed', 'transactionHash', 'raw', 'workspaceId', 'transactionId']
            });
            const tx = receipt ? await Transaction.findByPk(receipt.transactionId, { attributes: ['gasPrice', 'timestamp'] }) : null;
            const blockNumber = log.blockNumber || receipt?.blockNumber;

            const event = {
                args: parsed.args,
                blockNumber: blockNumber,
                transactionHash: log.transactionHash,
                transactionIndex: receipt?.transactionIndex,
                topics: log.topics,
                data: log.data
            };

            // Prepare a minimal provider; only used if we miss some fields
            const parentProvider = new ethers.providers.JsonRpcProvider(orbitConfig.parentChainRpcServer);

            // Index
            await indexNewBatchFromDb(orbitConfig, event, { receipt, tx }, parentProvider, { ...jobContext, batchNumber: bn });
            indexedBatches++;
        } catch (e) {
            errors.push({ error: e.message });
            logger.error('Failed to process indexed parent log for batch', { ...jobContext, error: e.message });
        }
    }

    return { batchesProcessed: logs.length, batchesIndexed: indexedBatches, batchesSkipped: skippedBatches, errors: errors.length };
}

async function indexNewBatchFromDb(orbitConfig, event, dbArtifacts, parentProvider, jobContext) {
    const { TransactionReceipt, Transaction } = require('../models');
    const batchSequenceNumber = event.args.batchSequenceNumber.toNumber();
    const receipt = dbArtifacts.receipt || null;
    const tx = dbArtifacts.tx || null;

    // Compute l1GasUsed/Price/Cost from local data when possible
    const l1GasUsed = receipt?.gasUsed;
    const l1GasPrice = tx?.gasPrice || null;
    const l1Cost = l1GasUsed && l1GasPrice ? (BigInt(l1GasUsed) * BigInt(l1GasPrice)).toString() : null;

    // Extract batch data
    const batchDataInfo = await extractBatchData(event, parentProvider, jobContext);

    const batchData = {
        workspaceId: orbitConfig.workspaceId,
        batchSequenceNumber: batchSequenceNumber,
        parentChainBlockNumber: event.blockNumber,
        parentChainTxHash: event.transactionHash,
        parentChainTxIndex: event.transactionIndex,
        postedAt: tx?.timestamp ? new Date(tx.timestamp) : new Date(),
        beforeAcc: event.args.beforeAcc,
        afterAcc: event.args.afterAcc,
        delayedAcc: event.args.delayedAcc,
        l1GasUsed: l1GasUsed,
        l1GasPrice: l1GasPrice ? String(l1GasPrice) : null,
        l1Cost: l1Cost,
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
            discoveryMethod: 'indexed-logs'
        }
    };

    await OrbitBatch.create(batchData);
}

/**
 * Discover batches by directly querying each batch number
 * This approach is more reliable than searching limited block ranges
 */
async function discoverBatchesByNumber(orbitConfig, parentProvider, sequencerInbox, fromBatch, toBatch, jobContext) {
    try {
        const config = getOrbitConfig();
        const maxBatchesPerRun = config.BATCH_DISCOVERY_LIMIT || 1000;
        
        // Limit the number of batches to process in one run
        const actualToBatch = Math.min(toBatch, fromBatch + maxBatchesPerRun);
        
        logger.info('Starting batch-by-batch discovery', {
            ...jobContext,
            fromBatch,
            toBatch,
            actualToBatch,
            maxBatchesPerRun
        });
        
        let indexedBatches = 0;
        let updatedBatches = 0;
        let skippedBatches = 0;
        const errors = [];
        
        // Process each batch number individually
        for (let batchNum = fromBatch; batchNum < actualToBatch; batchNum++) {
            try {
                const batchContext = { ...jobContext, batchNumber: batchNum };
                
                // Check if batch already exists
                const existingBatch = await OrbitBatch.findOne({
                    where: {
                        workspaceId: orbitConfig.workspaceId,
                        batchSequenceNumber: batchNum
                    }
                });
                
                if (existingBatch) {
                    logger.info('Batch already exists, skipping', batchContext);
                    skippedBatches++;
                    continue;
                }
                
                // Find the batch event by querying for the specific batch number
                const batchEvent = await findBatchEventByNumber(
                    parentProvider,
                    orbitConfig.sequencerInboxContract,
                    batchNum,
                    batchContext
                );
                
                if (batchEvent) {
                    // Index new batch
                    await indexNewBatch(orbitConfig, batchEvent, parentProvider, batchContext);
                    indexedBatches++;
                    
                    logger.info('Successfully indexed batch', {
                        ...batchContext,
                        indexedBatches,
                        remainingBatches: actualToBatch - batchNum - 1
                    });
                } else {
                    logger.warn('Batch event not found', batchContext);
                    errors.push({
                        batchNumber: batchNum,
                        error: 'Batch event not found'
                    });
                }
                
                // Add small delay between batches to avoid overwhelming RPC
                if (batchNum < actualToBatch - 1) {
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
                
            } catch (error) {
                const errorInfo = {
                    batchNumber: batchNum,
                    error: error.message
                };
                errors.push(errorInfo);
                
                logger.error('Error processing batch', {
                    ...jobContext,
                    ...errorInfo
                });
            }
        }
        
        const result = {
            batchesProcessed: actualToBatch - fromBatch,
            batchesIndexed: indexedBatches,
            batchesUpdated: updatedBatches,
            batchesSkipped: skippedBatches,
            errors: errors.length,
            errorDetails: errors.slice(0, 10), // Limit error details in response
            hasMoreBatches: actualToBatch < toBatch
        };
        
        logger.info('Completed batch-by-batch discovery', {
            ...jobContext,
            ...result
        });
        
        return result;
        
    } catch (error) {
        logger.error('Error in batch-by-batch discovery', {
            ...jobContext,
            error: error.message
        });
        throw error;
    }
}

/**
 * Find a specific batch event by batch number
 * Uses indexed parameter to efficiently query for specific batches
 */
async function findBatchEventByNumber(parentProvider, contractAddress, batchNumber, batchContext) {
    try {
        const contract = new ethers.Contract(
            contractAddress,
            SEQUENCER_INBOX_ABI,
            parentProvider
        );

        // Determine search window from config with sensible default
        const config = getOrbitConfig();
        const SEARCH_BLOCK_WINDOW = Number(9000);

        // Ensure proper encoding for indexed uint256
        const bn = ethers.BigNumber.from(batchNumber.toString());

        // Query for the specific batch number using indexed parameter
        const filter = contract.filters.SequencerBatchDelivered(bn);
        const currentBlock = await parentProvider.getBlockNumber();
        const fromBlock = Math.max(currentBlock - SEARCH_BLOCK_WINDOW, 0);
        console.log('fromBlock', fromBlock);
        const toBlock = 'latest';

        logger.debug('Querying SequencerBatchDelivered logs', {
            ...batchContext,
            fromBlock,
            toBlock: toBlock === 'latest' ? toBlock : Number(toBlock),
            searchWindow: SEARCH_BLOCK_WINDOW
        });

        let events = await contract.queryFilter(filter, fromBlock, toBlock);
        console.log('events', events);
        // Fallback: try provider.getLogs with explicit topics (in case of interface quirk)
        if (!events || events.length === 0) {
            const iface = new ethers.utils.Interface(SEQUENCER_INBOX_ABI);

            const tryEventByTopics = async (eventName) => {
                try {
                    const eventFragment = iface.getEvent(eventName);
                    const topic0 = iface.getEventTopic(eventFragment);
                    const paddedBatch = ethers.utils.hexZeroPad(bn.toHexString(), 32);

                    const logs = await parentProvider.getLogs({
                        address: contractAddress,
                        fromBlock,
                        toBlock,
                        topics: [topic0, paddedBatch]
                    });

                    if (logs && logs.length) {
                        return logs.map(log => ({
                            ...log,
                            ...iface.parseLog(log)
                        }));
                    }
                } catch (e) {
                    logger.debug(`getLogs failed for ${eventName}`, { ...batchContext, error: e.message });
                }
                return [];
            };

            // Primary event
            events = await tryEventByTopics('SequencerBatchDelivered');

            // Alternate event sometimes used on Nitro chains
            if (!events.length) {
                logger.debug('Primary event not found, trying SequencerBatchDeliveredFromOrigin', batchContext);
                events = await tryEventByTopics('SequencerBatchDeliveredFromOrigin');
            }

            // Diagnostic: fetch a few recent events without batch topic to verify address/window
            if (!events.length) {
                try {
                    const eventFragment = iface.getEvent('SequencerBatchDelivered');
                    const topic0 = iface.getEventTopic(eventFragment);

                    // Fallback: fetch by topic0 only and filter by decoded args
                    const logsWindow = await parentProvider.getLogs({
                        address: contractAddress,
                        fromBlock,
                        toBlock,
                        topics: [topic0]
                    });

                    const decoded = logsWindow.map(log => ({ ...log, ...iface.parseLog(log) }));
                    const matching = decoded.find(ev => {
                        try {
                            const evBn = ethers.BigNumber.from(ev.args.batchSequenceNumber);
                            return evBn.eq(bn);
                        } catch (_) { return false; }
                    });

                    if (matching) {
                        logger.info('Found batch event via broad scan fallback', {
                            ...batchContext,
                            blockNumber: matching.blockNumber,
                            transactionHash: matching.transactionHash
                        });
                        events = [matching];
                    } else {
                        logger.debug('Diagnostics: recent SequencerBatchDelivered logs found but none matched batch', {
                            ...batchContext,
                            sampleCount: logsWindow.length
                        });
                    }
                } catch (e) {
                    logger.debug('Diagnostics: failed to fetch/parse SequencerBatchDelivered logs', { ...batchContext, error: e.message });
                }
            }
        }

        if (events && events.length > 0) {
            logger.info('Found batch event', {
                ...batchContext,
                eventCount: events.length,
                blockNumber: events[0].blockNumber,
                transactionHash: events[0].transactionHash
            });
            return events[0]; // Return the first (and should be only) event
        }

        logger.debug('No batch event found', { ...batchContext, fromBlock, toBlock });
        return null;

    } catch (error) {
        logger.error('Error finding batch event', {
            ...batchContext,
            error: error.message
        });
        return null;
    }
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
                discoveryMethod: 'batch-by-batch',
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
            logger.info('Batch already indexed (race condition)', batchContext);
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
 * Extract batch data and transaction information using enhanced parser
 */
async function extractBatchData(event, parentProvider, batchContext) {
    try {
        const ArbitrumBatchParser = require('../lib/arbitrumBatchParser');
        const parser = new ArbitrumBatchParser();
        
        const batchData = event.args.data;
        const dataLocation = event.args.dataLocation;
        
        logger.info('Extracting batch data with enhanced parser', {
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