/**
 * This job is used to backfill native token transfers for a workspace.

 - Get each transaction for a workspace
 - Get the native token transfer for the transaction,
 - Create the token transfer from:
    - value field
    - trace steps
    - reward
**/
 
const { Op } = require('sequelize');
const { Transaction, TokenTransfer, TransactionTraceStep, TokenBalanceChange } = require('../models');

module.exports = async job => {
    const data = job.data;

    if (!data.transactionId)
        return 'Missing parameter';

    const transaction = await Transaction.findByPk(data.transactionId, {
        include: [
            {
                model: TokenTransfer,
                as: 'tokenTransfers',
                where: {
                    token: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
                }
            },
            {
                model: TokenBalanceChange,
                as: 'tokenBalanceChanges',
                where: {
                    token: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
                }
            },
            {
                model: TransactionTraceStep,
                as: 'transactionTraceSteps',
                where: {
                    value: {
                        [Op.gt]: 0
                    }
                }
            }
        ]
    });
};
