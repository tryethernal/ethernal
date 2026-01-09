const { Op } = require('sequelize');
const { OpDeposit, Transaction } = require('../models');
const logger = require('../lib/logger');

/**
 * Background job to link L1 deposits to their corresponding L2 transactions.
 * This job runs periodically and tries to find L2 transactions for pending deposits.
 *
 * The L2 transaction hash is derived from the L1 transaction hash and log index,
 * so we can look it up directly once the L2 block is synced.
 */
module.exports = async job => {
    try {
        // Find all pending deposits that don't have an L2 transaction linked
        const depositsToLink = await OpDeposit.findAll({
            where: {
                status: 'pending',
                l2TransactionId: null,
                l2TransactionHash: {
                    [Op.ne]: null
                }
            },
            limit: 100 // Process in batches
        });

        if (depositsToLink.length === 0) {
            return 'No deposits to link';
        }

        let linkedCount = 0;
        for (const deposit of depositsToLink) {
            try {
                // Try to find the L2 transaction
                const l2Transaction = await Transaction.findOne({
                    where: {
                        workspaceId: deposit.workspaceId,
                        hash: deposit.l2TransactionHash.toLowerCase()
                    }
                });

                if (l2Transaction) {
                    await deposit.update({
                        l2TransactionId: l2Transaction.id,
                        status: 'confirmed'
                    });
                    linkedCount++;
                    logger.info(`Linked OP deposit to L2 tx ${l2Transaction.hash} for workspace ${deposit.workspaceId}`);
                }
            } catch (error) {
                logger.error(`Error linking OP deposit ${deposit.id}: ${error.message}`, {
                    location: 'jobs.linkOpDepositsToL2Txs',
                    error,
                    depositId: deposit.id
                });
            }
        }

        return `Linked ${linkedCount} OP deposits to L2 transactions`;
    } catch (error) {
        logger.error(`Error in linkOpDepositsToL2Txs job: ${error.message}`, {
            location: 'jobs.linkOpDepositsToL2Txs',
            error
        });
        throw error;
    }
};
