/**
 * @fileoverview OP deposit linking job.
 * Links L1 deposits to their corresponding L2 transactions.
 * Uses batch lookup instead of N individual queries for efficiency.
 * @module jobs/linkOpDepositsToL2Txs
 */

const { Op } = require('sequelize');
const { OpDeposit, Transaction } = require('../models');
const logger = require('../lib/logger');

module.exports = async job => {
    try {
        const depositsToLink = await OpDeposit.findAll({
            where: {
                status: 'pending',
                l2TransactionId: null,
                l2TransactionHash: {
                    [Op.ne]: null
                }
            },
            limit: 100
        });

        if (depositsToLink.length === 0)
            return 'No deposits to link';

        // Batch lookup: single query for all L2 transaction hashes
        const hashes = depositsToLink.map(d => d.l2TransactionHash.toLowerCase());
        const l2Txs = await Transaction.findAll({
            where: { hash: { [Op.in]: hashes } },
            attributes: ['id', 'hash', 'workspaceId']
        });
        const txByHash = new Map(l2Txs.map(tx => [tx.hash.toLowerCase(), tx]));

        let linkedCount = 0;
        for (const deposit of depositsToLink) {
            const l2Tx = txByHash.get(deposit.l2TransactionHash.toLowerCase());
            if (l2Tx && l2Tx.workspaceId === deposit.workspaceId) {
                try {
                    await deposit.update({
                        l2TransactionId: l2Tx.id,
                        status: 'confirmed'
                    });
                    linkedCount++;
                } catch (error) {
                    logger.error(`Error linking OP deposit ${deposit.id}: ${error.message}`, {
                        location: 'jobs.linkOpDepositsToL2Txs',
                        error,
                        depositId: deposit.id
                    });
                }
            }
        }

        if (linkedCount > 0)
            logger.info(`Linked ${linkedCount} OP deposits to L2 transactions`);

        return `Linked ${linkedCount} OP deposits to L2 transactions`;
    } catch (error) {
        logger.error(`Error in linkOpDepositsToL2Txs job: ${error.message}`, {
            location: 'jobs.linkOpDepositsToL2Txs',
            error
        });
        throw error;
    }
};
