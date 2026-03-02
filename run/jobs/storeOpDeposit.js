/**
 * @fileoverview OP Stack deposit storage job.
 * Stores L1→L2 deposit records from TransactionDeposited events.
 * @module jobs/storeOpDeposit
 */

const { OpDeposit, Transaction } = require('../models');
const logger = require('../lib/logger');

module.exports = async (job) => {
    const {
        workspaceId,
        l1BlockNumber,
        l1TransactionHash,
        l1TransactionId,
        from,
        to,
        value,
        gasLimit,
        data,
        isCreation,
        timestamp
    } = job.data;

    if (!workspaceId || !l1TransactionHash || !from)
        throw new Error('Missing required parameters');

    // Check if deposit already exists
    const existing = await OpDeposit.findOne({
        where: {
            workspaceId,
            l1TransactionHash: l1TransactionHash.toLowerCase()
        }
    });

    if (existing) {
        logger.info(`OP deposit already exists for tx ${l1TransactionHash}`, { location: 'jobs.storeOpDeposit' });
        return existing;
    }

    const deposit = await OpDeposit.create({
        workspaceId,
        l1BlockNumber,
        l1TransactionHash,
        l1TransactionId,
        from,
        to,
        value,
        gasLimit,
        data,
        isCreation: isCreation || false,
        timestamp: timestamp || new Date(),
        status: 'pending'
    });

    logger.info(`Created OP deposit from tx ${l1TransactionHash}`, { location: 'jobs.storeOpDeposit' });

    return deposit;
};
