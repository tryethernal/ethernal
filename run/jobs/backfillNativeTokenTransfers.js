/**
 * This job is used to backfill native token transfers for a workspace.

 - Get each transaction for a workspace
 - Get the native token transfer for the transaction,
 - Create the token transfer from:
    - value field
    - trace steps
    - reward
**/
 
const { Transaction, TokenTransfer, TransactionTraceStep, TokenBalanceChange } = require('../models');
const { sequelize } = require('../models');
const ethers = require('ethers');
const { sanitize } = require('../utils');

const BigNumber = ethers.BigNumber;

const findRewardTokenTransfer = async (transaction) => {
    return transaction.tokenTransfers.find(tokenTransfer => tokenTransfer.token === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' && tokenTransfer.isReward);
};

const findValueTokenTransfer = async (transaction) => {
    return transaction.tokenTransfers.find(tokenTransfer => tokenTransfer.token === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' && BigNumber.from(tokenTransfer.amount).eq(transaction.value));
};

module.exports = async job => {
    const data = job.data;

    if (!data.transactionId)
        return 'Missing parameter';

    const transaction = await Transaction.findByPk(data.transactionId, {
        include: [
            'block', 'receipt',
            {
                model: TokenTransfer,
                as: 'tokenTransfers',
                where: {
                    token: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
                },
                include: [
                    {
                        model: TokenBalanceChange,
                        as: 'tokenBalanceChanges',
                        required: false
                    }
                ],
                required: false
            },
            {
                model: TransactionTraceStep,
                as: 'traceSteps',
                where: sequelize.literal('CAST("traceSteps"."value" AS NUMERIC) > 0'),
                required: false
            }
        ]
    });

    const tokenTransfers = [];

    const rewardTokenTransfer = findRewardTokenTransfer(transaction);
    if (!rewardTokenTransfer) {
        let toValidator;
        if (transaction.type && transaction.type == 2) {
            // Use BigNumber for (effectiveGasPrice - baseFeePerGas) * gasUsed
            const effectiveGasPrice = ethers.BigNumber.from(transaction.receipt.raw.effectiveGasPrice);
            const baseFeePerGas = ethers.BigNumber.from(transaction.block.baseFeePerGas);
            const gasUsed = ethers.BigNumber.from(transaction.receipt.gasUsed);
            toValidator = effectiveGasPrice.sub(baseFeePerGas).mul(gasUsed);
        } else {
            // Use BigNumber for gasPrice * gasUsed
            const gasPrice = ethers.BigNumber.from(transaction.gasPrice);
            const gasUsed = ethers.BigNumber.from(transaction.receipt.gasUsed);
            toValidator = gasPrice.mul(gasUsed);
        }

        tokenTransfers.push(sanitize({
            transactionId: transaction.id,
            transactionLogId: null,
            workspaceId: transaction.workspaceId,
            src: transaction.from,
            dst: transaction.block.miner,
            amount: toValidator.toString(),
            token: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
            tokenId: null,
            isReward: true
        }));
    }

    const value = BigNumber.from(transaction.value);
    if (value.gt(ethers.constants.Zero) && !findValueTokenTransfer(transaction)) {
        let dstAddress = transaction.to;
        // If contract creation (to is null), use receipt.contractAddress
        if (!dstAddress && transaction.receipt.contractAddress) {
            dstAddress = transaction.receipt.contractAddress;
        }
        tokenTransfers.push(sanitize({
            transactionId: transaction.id,
            transactionLogId: null,
            workspaceId: transaction.workspaceId,
            src: transaction.from,
            dst: dstAddress,
            amount: value.toString(),
            token: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
            tokenId: null,
            isReward: false
        }));
    }

    console.log(transaction.tokenTransfers);
    console.log(transaction.tokenBalanceChanges);
    console.log(transaction.traceSteps);
};
