/**
 * This job is used to backfill native token transfers for a workspace.

 - Get each transaction for a workspace
 - Get the native token transfer for the transaction,
 - Create the token transfer from:
    - value field
    - trace steps
    - reward
**/
 
const { Transaction, TokenTransfer, TransactionTraceStep, TokenBalanceChange, TokenTransferEvent } = require('../models');
const { sequelize } = require('../models');
const ethers = require('ethers');
const { sanitize, eToNumber } = require('../lib/utils');

const BigNumber = ethers.BigNumber;

const findRewardTokenTransfer = transaction => {
    return transaction.tokenTransfers.find(tokenTransfer => tokenTransfer.token === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' && tokenTransfer.isReward);
};

const findValueTokenTransfer = transaction => {
    return transaction.tokenTransfers.find(tokenTransfer => tokenTransfer.token === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' && BigNumber.from(String(tokenTransfer.amount)).eq(transaction.value));
};

const findTraceStepParentAddress = (step, steps) => {
    const filtered = steps.filter(s => s.depth === step.depth - 1);
    if (filtered.length === 0) return null;
    return filtered[filtered.length - 1].address;
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
            const effectiveGasPrice = ethers.BigNumber.from(String(transaction.receipt.raw.effectiveGasPrice));
            const baseFeePerGas = ethers.BigNumber.from(String(transaction.block.baseFeePerGas));
            const gasUsed = ethers.BigNumber.from(String(transaction.receipt.gasUsed));
            toValidator = effectiveGasPrice.sub(baseFeePerGas).mul(gasUsed);
        } else {
            // Use BigNumber for gasPrice * gasUsed
            const gasPrice = ethers.BigNumber.from(String(transaction.gasPrice));
            const gasUsed = ethers.BigNumber.from(String(transaction.receipt.gasUsed));
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
    else if (!rewardTokenTransfer.tokenBalanceChanges.length) {
        await sequelize.transaction(async sequelizeTransaction => {
            await rewardTokenTransfer.afterCreate({ transaction: sequelizeTransaction });
        });
    }

    const value = BigNumber.from(eToNumber(String(transaction.value)));
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
    else if (value.gt(ethers.constants.Zero) && !findValueTokenTransfer(transaction).tokenBalanceChanges.length) {
        await sequelize.transaction(async sequelizeTransaction => {
            await findValueTokenTransfer(transaction).afterCreate({ transaction: sequelizeTransaction });
        });
    }

    for (const step of transaction.traceSteps) {
        const stepValue = BigNumber.from(eToNumber(String(step.value)));
        if (stepValue.gt(ethers.constants.Zero)) {
            tokenTransfers.push(sanitize({
                transactionId: transaction.id,
                transactionLogId: null,
                workspaceId: transaction.workspaceId,
                src: step.depth == 1 ? transaction.to : findTraceStepParentAddress(step, transaction.traceSteps),
                dst: step.address,
                amount: stepValue.toString(),
                token: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                tokenId: null,
                isReward: false
            }));
        }
    }

    return sequelize.transaction(async sequelizeTransaction => {
        if (!tokenTransfers.length)
            return false;

        const createdTokenTransfers = await TokenTransfer.bulkCreate(tokenTransfers, {
            ignoreDuplicates: true,
            transaction: sequelizeTransaction
        });
    
        const tokenTransferEvents = [];
        for (const tokenTransfer of createdTokenTransfers) {
            tokenTransferEvents.push(sanitize({
                workspaceId: transaction.workspaceId,
                tokenTransferId: tokenTransfer.id,
                blockNumber: transaction.blockNumber,
                timestamp: transaction.timestamp,
                amount: tokenTransfer.amount,
                token: tokenTransfer.token,
                tokenType: null, // This is ok as we are only creating native token transfer events here
                src: tokenTransfer.src,
                dst: tokenTransfer.dst,
                isReward: tokenTransfer.isReward
            }));
        }

        await TokenTransferEvent.bulkCreate(tokenTransferEvents, {
            ignoreDuplicates: true,
            transaction: sequelizeTransaction
        });

        return true;
    });
};
