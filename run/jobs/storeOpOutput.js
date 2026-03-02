/**
 * @fileoverview OP Stack output storage job.
 * Stores state output records from L2OutputOracle or DisputeGameFactory.
 * @module jobs/storeOpOutput
 */

const { OpOutput } = require('../models');
const logger = require('../lib/logger');

module.exports = async (job) => {
    const {
        workspaceId,
        outputIndex,
        outputRoot,
        l2BlockNumber,
        l1BlockNumber,
        l1TransactionHash,
        l1TransactionId,
        proposer,
        timestamp,
        challengePeriodEnds,
        disputeGameAddress,
        gameType
    } = job.data;

    if (!workspaceId || !l1TransactionHash || !outputRoot)
        throw new Error('Missing required parameters');

    // Check if output already exists (by outputIndex or disputeGameAddress)
    const whereClause = {
        workspaceId,
        l1TransactionHash: l1TransactionHash.toLowerCase()
    };

    const existing = await OpOutput.findOne({ where: whereClause });

    if (existing) {
        logger.info(`OP output already exists for tx ${l1TransactionHash}`, { location: 'jobs.storeOpOutput' });
        return existing;
    }

    const output = await OpOutput.create({
        workspaceId,
        outputIndex: outputIndex || 0,
        outputRoot,
        l2BlockNumber: l2BlockNumber || 0,
        l1BlockNumber,
        l1TransactionHash,
        l1TransactionId,
        proposer,
        timestamp: timestamp || new Date(),
        challengePeriodEnds,
        disputeGameAddress,
        gameType,
        status: 'proposed'
    });

    logger.info(`Created OP output from tx ${l1TransactionHash}`, { location: 'jobs.storeOpOutput' });

    return output;
};
