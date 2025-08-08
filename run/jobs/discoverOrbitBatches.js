const { OrbitBatch, OrbitChainConfig, sequelize } = require('../models');
const { getOrbitConfig } = require('../lib/orbitConfig');
const { markJobCompleted } = require('../lib/orbitBatchQueue');
const logger = require('../lib/logger');
const { ethers } = require('ethers');

// Sequencer Inbox ABI for batch discovery
const SEQUENCER_INBOX_ABI = [
    'event SequencerBatchDelivered(uint256 indexed batchSequenceNumber, bytes32 indexed beforeAcc, bytes32 indexed afterAcc, bytes32 delayedAcc, uint256 afterDelayedMessagesRead, tuple(uint64 minTimestamp, uint64 maxTimestamp, uint64 minBlockNumber, uint64 maxBlockNumber) timeBounds, uint8 dataLocation, bytes data)'
];

/**
 * Dedicated job for discovering and indexing new orbit batches
 * Reads from parent workspace indexed logs only
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

        if (!orbitConfig.parentWorkspaceId) {
            logger.debug('No parent workspace configured; skipping discovery', jobContext);
            return { status: 'skipped', reason: 'no_parent_workspace' };
        }

        // Get latest indexed batch
        const latestIndexedBatch = await OrbitBatch.findOne({
            where: { workspaceId },
            order: [['batchSequenceNumber', 'DESC']],
            limit: 1
        });
        const lastIndexedNumber = latestIndexedBatch ? latestIndexedBatch.batchSequenceNumber : 0;

        const discoveryResult = await discoverBatchesFromIndexedLogs(orbitConfig, lastIndexedNumber + 1, jobContext);

        const result = { status: 'completed', strategy: 'indexed_logs', lastIndexedNumber, ...discoveryResult };
        logger.info('Completed orbit batch discovery (indexed logs)', { ...jobContext, ...result });
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
    const { TransactionLog, TransactionReceipt, Transaction } = require('../models');
    const iface = new ethers.utils.Interface(SEQUENCER_INBOX_ABI);
    const eventFragment = iface.getEvent('SequencerBatchDelivered');
    const topic0 = iface.getEventTopic(eventFragment);

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
            if (bn < startFromBatch) { skippedBatches++; continue; }

            const exists = await OrbitBatch.findOne({ where: { workspaceId: orbitConfig.workspaceId, batchSequenceNumber: bn } });
            if (exists) { skippedBatches++; continue; }

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

            await indexNewBatchFromDb(orbitConfig, event, { receipt, tx }, { ...jobContext, batchNumber: bn });
            indexedBatches++;
        } catch (e) {
            errors.push({ error: e.message });
            logger.error('Failed to process indexed parent log for batch', { ...jobContext, error: e.message });
        }
    }

    return { batchesProcessed: logs.length, batchesIndexed: indexedBatches, batchesSkipped: skippedBatches, errors: errors.length };
}

async function indexNewBatchFromDb(orbitConfig, event, dbArtifacts, jobContext) {
    const batchSequenceNumber = event.args.batchSequenceNumber.toNumber();
    const receipt = dbArtifacts.receipt || null;
    const tx = dbArtifacts.tx || null;

    const l1GasUsed = receipt?.gasUsed;
    const l1GasPrice = tx?.gasPrice || null;
    const l1Cost = l1GasUsed && l1GasPrice ? (BigInt(l1GasUsed) * BigInt(l1GasPrice)).toString() : null;

    const batchDataInfo = await extractBatchData(event, null, jobContext);

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

function getDataLocationFromEvent(event) {
    const dataLocation = event.args.dataLocation || 0;
    switch (dataLocation) {
        case 0: return 'onchain';
        case 1: return 'das';
        case 2: return 'ipfs';
        default: return 'onchain';
    }
}

async function extractBatchData(event, _unusedProvider, batchContext) {
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
        const parseResult = await parser.parseBatchData(batchData, dataLocation, batchContext);
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

module.exports = discoverOrbitBatches;