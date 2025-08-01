'use strict';
const {
  Model,
  Sequelize
} = require('sequelize');
const ethers = require('ethers');
const Op = Sequelize.Op
const { sanitize, stringifyBns, processRawRpcObject, eToNumber } = require('../lib/utils');
const { trigger } = require('../lib/pusher');
const logger = require('../lib/logger');
let { getTransactionMethodDetails, getTokenTransfer } = require('../lib/abi');
const moment = require('moment');

module.exports = (sequelize, DataTypes) => {
  class Transaction extends Model {

    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Transaction.belongsTo(models.Workspace, { foreignKey: 'workspaceId', as: 'workspace' });
      Transaction.belongsTo(models.Block, { foreignKey: 'blockId', as: 'block' });
      Transaction.hasOne(models.Contract, {
          sourceKey: 'to',
          foreignKey:  'address',
          as: 'contract',
          scope: {
            [Op.and]: sequelize.where(sequelize.col("Transaction.workspaceId"),
                Op.eq,
                sequelize.col("contract.workspaceId")
              ),
            },
          constraints: false
      });
      Transaction.hasOne(models.Contract, { foreignKey: 'transactionId', as: 'createdContract' });
      Transaction.hasOne(models.TransactionReceipt, { foreignKey: 'transactionId', as: 'receipt' });
      Transaction.hasOne(models.TransactionEvent, { foreignKey: 'transactionId', as: 'event' });
      Transaction.hasMany(models.TokenTransfer, { foreignKey: 'transactionId', as: 'tokenTransfers' });
      Transaction.hasMany(models.TokenBalanceChange, { foreignKey: 'transactionId', as: 'tokenBalanceChanges' });
      Transaction.hasMany(models.TransactionTraceStep, { foreignKey: 'transactionId', as: 'traceSteps' });
    }

    /**
     * Get trace steps for a transaction
     * @returns {Promise<Array>} - An array of trace steps
     */
    getTraceSteps() {
        return sequelize.query(`
            SELECT
                tts.id,
                tts."transactionId",
                tts.address,
                tts.depth,
                tts.input,
                tts.op,
                tts."returnData",
                tts.value,
                c."tokenSymbol" AS "contract.tokenSymbol",
                c."tokenName" AS "contract.tokenName",
                c."tokenDecimals" AS "contract.tokenDecimals",
                c."name" AS "contract.name",
                c."abi" AS "contract.abi"
            FROM transaction_trace_steps tts
            LEFT JOIN contracts c ON
                tts.address = c.address
                AND tts."workspaceId" = c."workspaceId"
            WHERE tts."transactionId" = :transactionId
            AND tts."workspaceId" = :workspaceId
            ORDER BY tts.id ASC
        `, {
            replacements: { transactionId: this.id, workspaceId: this.workspaceId },
            type: sequelize.QueryTypes.SELECT,
            nest: true
        });
    }

    /**
     * Get token balance changes for a transaction
     * @param {number} page - The page number to fetch
     * @param {number} itemsPerPage - The number of items per page
     * @returns {Promise<Array>} - An array of token balance changes
     */
    async getTokenBalanceChanges(page = 1, itemsPerPage = 10) {
        const result = await sequelize.query(`
            SELECT
                tbc.token,
                tbc.address,
                tbc."currentBalance",
                tbc."previousBalance",
                tbc."diff",
                c."tokenSymbol" AS "contract.tokenSymbol",
                c."tokenName" AS "contract.tokenName",
                c."tokenDecimals" AS "contract.tokenDecimals",
                c."name" AS "contract.name"
            FROM token_balance_changes tbc
            LEFT JOIN contracts c ON
                tbc.token = c.address
                AND tbc."workspaceId" = c."workspaceId"
            WHERE tbc."transactionId" = :transactionId
            AND tbc."workspaceId" = :workspaceId
            ORDER BY tbc.id DESC
            LIMIT :itemsPerPage OFFSET :offset
        `, {
            replacements: {
                transactionId: this.id,
                workspaceId: this.workspaceId,
                itemsPerPage: itemsPerPage,
                offset: (Math.max(page, 1) - 1) * itemsPerPage
            },
            type: sequelize.QueryTypes.SELECT,
            nest: true
        });

        const processedTokenBalanceChanges = [];

        const explorer = await sequelize.models.Explorer.findOne({ where: { workspaceId: this.workspaceId } });
        for (const balanceChange of result) {
            const balanceChangeCopy = { ...balanceChange };
            if (balanceChange.token === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
                // Only inject custom contract object for native token
                if (explorer) {
                    balanceChangeCopy.contract = {
                        tokenSymbol: explorer.token || 'ETH',
                        tokenDecimals: 18,
                        tokenName: explorer.token || 'Ether'
                    };
                }
            }
            processedTokenBalanceChanges.push(balanceChangeCopy);
        }

        return processedTokenBalanceChanges;
    }

    async safeDestroy(transaction) {
        const receipt = await this.getReceipt();
        if (receipt)
            await receipt.safeDestroy(transaction);

        const traceSteps = await this.getTraceSteps();
        for (let i = 0; i < traceSteps.length; i++)
            await traceSteps[i].destroy({ transaction });

        const event = await this.getEvent();
        if (event)
            await event.destroy({ transaction });

        const contract = await sequelize.models.Contract.findOne({ where: { transactionId: this.id }});
        if (contract)
            await contract.update({ transactionId: null }, { transaction });

        return this.destroy({ transaction });
    }

    async safeCreateReceipt(receipt) {
        if (!receipt) throw new Error('Missing parameter');

        return sequelize.transaction(async transaction => {
            await this.update({ state: 'ready' }, { transaction });

            const [storedReceipt] = await this.sequelize.models.TransactionReceipt.bulkCreate(
                [
                    stringifyBns(sanitize({
                        transactionId: this.id,
                        workspaceId: this.workspaceId,
                        blockHash: receipt.blockHash,
                        blockNumber: receipt.blockNumber,
                        byzantium: receipt.byzantium,
                        confirmations: receipt.confirmations,
                        contractAddress: receipt.contractAddress,
                        cumulativeGasUsed: receipt.cumulativeGasUsed,
                        from: receipt.from,
                        gasUsed: receipt.gasUsed,
                        logsBloom: receipt.logsBloom,
                        status: receipt.status,
                        to: receipt.to,
                        transactionHash: receipt.transactionHash !== undefined ? receipt.transactionHash : receipt.hash,
                        transactionIndex: receipt.transactionIndex !== undefined && receipt.transactionIndex !== null ? receipt.transactionIndex : receipt.index,
                        type: receipt.type,
                        raw: receipt.raw
                    }))
                ],
                {
                    ignoreDuplicates: true,
                    returning: true,
                    transaction
                }
            );

            if (!storedReceipt || !storedReceipt.id)
                return 'Receipt already exists';

            const processedLogs = [];
            for (let i = 0; i < receipt.logs.length; i++) {
                const log = processRawRpcObject(
                    receipt.logs[i],
                    Object.keys(sequelize.models.TransactionLog.rawAttributes)
                );

                processedLogs.push(sanitize({
                    transactionReceiptId: storedReceipt.id,
                    workspaceId: this.workspaceId,
                    address: log.address,
                    blockHash: log.blockHash,
                    blockNumber: log.blockNumber || receipt.blockNumber,
                    data: log.data,
                    logIndex: log.logIndex,
                    topics: log.topics,
                    transactionHash: log.transactionHash,
                    transactionIndex: log.transactionIndex,
                    raw: log.raw
                }));
            }

            let storedLogs;
            try {
                storedLogs = await sequelize.models.TransactionLog.bulkCreate(processedLogs,
                    {
                        ignoreDuplicates: true,
                        returning: true,
                        transaction
                    }
                );
            } catch(error) {
                logger.error(error.message, { location: 'models.transaction.safeCreateReceipt', error: error, receipt, transaction: this });
                storedLogs = [];
                for (let i = 0; i < processedLogs.length; i++) {
                    const log = processedLogs[i];
                    storedLogs.push([
                        await sequelize.models.TransactionLog.bulkCreate(
                            [
                                sanitize({
                                    workspaceId: this.workspaceId,
                                    transactionReceiptId: storedReceipt.id,
                                    transactionId: this.id,
                                    blockNumber: log.blockNumber || receipt.blockNumber,
                                    raw: log.raw
                                })
                            ],
                            {
                                ignoreDuplicates: true,
                                returning: true,
                                transaction
                            }
                        )
                    ]);
                }
            }

            const tokenTransfers = [];
            for (let i = 0; i < storedLogs.length; i++) {
                const log = storedLogs[i];
                const tokenTransfer = getTokenTransfer(log);
                if (tokenTransfer && log.id)
                    tokenTransfers.push(sanitize({
                        transactionId: this.id,
                        transactionLogId: log.id,
                        workspaceId: this.workspaceId,
                        isReward: false,
                        ...tokenTransfer
                    }));
            }

            const block = await this.getBlock();
            let toValidator;
            if (this.type && this.type == 2) {
                // Use BigNumber for (effectiveGasPrice - baseFeePerGas) * gasUsed
                const effectiveGasPrice = ethers.BigNumber.from(String(receipt.raw.effectiveGasPrice));
                const baseFeePerGas = ethers.BigNumber.from(String(block.baseFeePerGas || 0));
                const gasUsed = ethers.BigNumber.from(String(receipt.gasUsed));
                toValidator = effectiveGasPrice.sub(baseFeePerGas).mul(gasUsed);
            } else {
                // Use BigNumber for gasPrice * gasUsed
                const gasPrice = ethers.BigNumber.from(String(this.gasPrice));
                const gasUsed = ethers.BigNumber.from(String(receipt.gasUsed));
                toValidator = gasPrice.mul(gasUsed);
            }

            tokenTransfers.push(sanitize({
                transactionId: this.id,
                transactionLogId: null,
                workspaceId: this.workspaceId,
                src: this.from,
                dst: block.miner,
                amount: toValidator.toString(),
                token: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                tokenId: null,
                isReward: true
            }));

            if (this.value) {
                // Use BigNumber for value comparison
                const valueBN = ethers.BigNumber.from(eToNumber(String(this.value)));
                if (valueBN.gt(ethers.constants.Zero)) {
                    let dstAddress = this.to;
                    // If contract creation (to is null), use receipt.contractAddress
                    if (!dstAddress && receipt.contractAddress) {
                        dstAddress = receipt.contractAddress;
                    }
                    tokenTransfers.push(sanitize({
                        transactionId: this.id,
                        transactionLogId: null,
                        workspaceId: this.workspaceId,
                        src: this.from,
                        dst: dstAddress,
                        amount: valueBN.toString(),
                        token: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                        tokenId: null,
                        isReward: false
                    }));
                }
            }

            const events = [];
            if (tokenTransfers.length > 0) {
                const storedTokenTransfers = await sequelize.models.TokenTransfer.bulkCreate(tokenTransfers, {
                    ignoreDuplicates: true,
                    returning: true,
                    transaction
                });

                for (let i = 0; i < storedTokenTransfers.length; i++)
                    trigger(`private-contractLog;workspace=${this.workspaceId};contract=${tokenTransfers[i].address}`, 'new', null);

                for (let i = 0; i < storedTokenTransfers.length; i++) {
                    const tokenTransfer = storedTokenTransfers[i];
                    if (!tokenTransfer.id)
                        continue;

                    const contract = await sequelize.models.Contract.findOne({
                        where: {
                            workspaceId: this.workspaceId,
                            address: tokenTransfer.token
                        }
                    });
                    if (!contract && tokenTransfer.token !== '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
                        const workspace = await this.getWorkspace();
                        await workspace.safeCreateOrUpdateContract({
                            address: tokenTransfer.token,
                            timestamp: moment(this.timestamp).unix()
                        }, transaction);
                    }

                    events.push(sanitize({
                        workspaceId: this.workspaceId,
                        tokenTransferId: tokenTransfer.id,
                        blockNumber: receipt.blockNumber,
                        timestamp: this.timestamp,
                        amount: tokenTransfer.amount,
                        token: tokenTransfer.token,
                        tokenType: contract ? contract.patterns[0] : null,
                        src: tokenTransfer.src,
                        dst: tokenTransfer.dst,
                        isReward: tokenTransfer.isReward
                    }));
                }
            }

            await sequelize.models.TokenTransferEvent.bulkCreate(events, {
                ignoreDuplicates: true,
                transaction
            });

            await storedReceipt.insertAnalyticEvent(transaction);

            return storedReceipt;
        });
    }

    async getFilteredTokenTransfers(page = 1, itemsPerPage = 10, order = 'DESC', orderBy = 'id') {
        const result = await sequelize.models.TokenTransfer.findAndCountAll({
            where: { transactionId: this.id, isReward: false },
            include: {
                model: sequelize.models.Contract,
                as: 'contract',
                attributes: ['tokenSymbol', 'tokenDecimals', 'isToken', 'patterns', 'name', 'tokenName'],
                include: {
                    model: sequelize.models.ContractVerification,
                    as: 'verification',
                    attributes: ['createdAt']
                }
            },
            offset: (page - 1) * itemsPerPage,
            limit: itemsPerPage,
            order: [[orderBy, order]]
        });

        const tokenTransfers = result.rows.map(t => t.toJSON());
        const processedTokenTransfers = [];

        const explorer = await sequelize.models.Explorer.findOne({ where: { workspaceId: this.workspaceId } });
        for (const transfer of tokenTransfers) {
            const transferCopy = { ...transfer };
            if (transfer.token === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
                // Only inject custom contract object for native token
                if (explorer) {
                    transferCopy.contract = {
                        tokenSymbol: explorer.token || 'ETH',
                        tokenDecimals: 18,
                        tokenName: explorer.token || 'Ether'
                    };
                }
            }
            processedTokenTransfers.push(transferCopy);
        }

        return {
            items: processedTokenTransfers,
            total: result.count
        };
    }

    async countTokenTransfers() {
        const [{ count }] = await sequelize.query(`
            SELECT COUNT(*)::int
            FROM token_transfers
            WHERE "transactionId" = :id
            AND "workspaceId" = :workspaceId
        `, {
            replacements: { id: this.id, workspaceId: this.workspaceId },
            type: sequelize.QueryTypes.SELECT
        });
        return count;
    }

    getContract() {
        return sequelize.models.Contract.findOne({
            where: {
                workspaceId: this.workspaceId,
                address: this.to
            }
        });
    }

    updateMethodDetails(methodDetails) {
        return this.update(sanitize({
            methodLabel: methodDetails.label,
            methodName: methodDetails.name,
            methodSignature: methodDetails.signature
        }));
    }

    safeCreateTokenTransfer(tokenTransfer) {
        return this.createTokenTransfer(sanitize({
            workspaceId: this.workspaceId,
            dst: tokenTransfer.dst,
            src: tokenTransfer.src,
            amount: tokenTransfer.amount,
            token: tokenTransfer.token,
            tokenId: tokenTransfer.tokenId
        }));
    }

    updateFailedTransactionError(error) {
        return this.update({
            parsedError: error.parsed ? error.message : null,
            rawError: error.parsed ? null :  error.message
        });
    }

    safeUpdateStorage(data) {
        return this.update({
            storage: data
        });
    }

    triggerEvents() {
        const data = {
            hash: this.hash,
            state: this.state,
            blockNumber: this.blockNumber,
            from: this.from,
            to: this.to
        };

        trigger(`private-transactions;workspace=${this.workspaceId}`, 'new', data);
        if (this.to)
            trigger(`private-transactions;workspace=${this.workspaceId};address=${this.to}`, 'new', data);
        return trigger(`private-transactions;workspace=${this.workspaceId};address=${this.from}`, 'new', data);
    };

    safeCreateTransactionTrace(steps) {
        return sequelize.transaction(async transaction => {

            // Find parent address for each step
            const findParentAddress = (step, steps) => {
                const filtered = steps.filter(s => s.depth === step.depth - 1);
                if (filtered.length === 0) return null;
                return filtered[filtered.length - 1].address;
            };

            const augmentedSteps = steps.map(step => ({
                ...step,
                workspaceId: this.workspaceId,
                timestamp: this.timestamp,
                transactionId: this.id,
                parentAddress: step.depth === 1 ? this.to : findParentAddress(step, steps)
            }));

            const tokenTransfers = [];
            for (const step of augmentedSteps) {
                // Use BigNumber for value comparison
                if (step.value) {
                    const valueBN = ethers.BigNumber.from(eToNumber(String(step.value)));
                    if (valueBN.gt(ethers.constants.Zero)) {
                        tokenTransfers.push(sanitize({
                            transactionId: this.id,
                            transactionLogId: null,
                            workspaceId: this.workspaceId,
                            src: step.parentAddress,
                            dst: step.address,
                            amount: valueBN.toString(),
                            token: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                            tokenId: null,
                            isReward: false
                        }));
                    }
                }
            }

            const createdTokenTransfers = await sequelize.models.TokenTransfer.bulkCreate(tokenTransfers, {
                ignoreDuplicates: true,
                transaction
            });

            const tokenTransferEvents = [];
            for (const tokenTransfer of createdTokenTransfers) {
                tokenTransferEvents.push(sanitize({
                    workspaceId: this.workspaceId,
                    tokenTransferId: tokenTransfer.id,
                    blockNumber: this.blockNumber,
                    timestamp: this.timestamp,
                    amount: tokenTransfer.amount,
                    token: tokenTransfer.token,
                    tokenType: null, // This is ok as we are only creating native token transfer events here
                    src: tokenTransfer.src,
                    dst: tokenTransfer.dst,
                    isReward: false
                }));
            }

            await sequelize.models.TokenTransferEvent.bulkCreate(tokenTransferEvents, {
                ignoreDuplicates: true,
                transaction
            });

            const contracts = steps
                .filter(step => step.contractHashedBytecode)
                .map(step => ({ address: step.address, workspaceId: this.workspaceId }));

            await sequelize.models.Contract.bulkCreate(contracts, {
                ignoreDuplicates: true,
                transaction
            });

            return sequelize.models.TransactionTraceStep.bulkCreate(augmentedSteps, {
                ignoreDuplicates: true,
                returning: true,
                transaction
            });
        });
    }

    async afterCreate(options) {
        const afterCommitFn = () => {
            return this.triggerEvents();
        };

        if (options.transaction)
            return options.transaction.afterCommit(afterCommitFn);
        else
            return afterCommitFn();
    }
  }
  Transaction.init({
    blockHash: DataTypes.STRING,
    blockNumber: DataTypes.INTEGER,
    blockId: DataTypes.INTEGER,
    chainId: DataTypes.INTEGER,
    creates: DataTypes.STRING,
    data: DataTypes.STRING,
    parsedError: DataTypes.STRING,
    rawError: DataTypes.JSON,
    from: {
        type: DataTypes.STRING,
        set(value) {
            this.setDataValue('from', value.toLowerCase());
        },
        get() {
            return this.getDataValue('from') ? this.getDataValue('from').toLowerCase() : null;
        }
    },
    gasLimit: DataTypes.STRING,
    gasPrice: DataTypes.STRING,
    hash: DataTypes.STRING,
    methodDetails: {
        type: DataTypes.VIRTUAL,
        get() {
            return getTransactionMethodDetails(this, this.contract && this.contract.abi);
        }
    },
    nonce: DataTypes.INTEGER,
    r: DataTypes.STRING,
    s: DataTypes.STRING,
    timestamp: {
        type: DataTypes.DATE,
        set(value) {
            if (String(value).length > 10)
              this.setDataValue('timestamp', moment(value).format());
            else
              this.setDataValue('timestamp', moment.unix(value).format());
        }
    },
    to: {
        type: DataTypes.STRING,
        set(value) {
            this.setDataValue('to', value.toLowerCase());
        },
        get() {
            return this.getDataValue('to') ? this.getDataValue('to').toLowerCase() : null;
        }
    },
    transactionIndex: DataTypes.INTEGER,
    type: DataTypes.INTEGER,
    v: DataTypes.INTEGER,
    value: {
        type: DataTypes.STRING,
        set(value) {
            this.setDataValue('value', value.toString(10));
        },
        get() {
            return this.getDataValue('value') ? this.getDataValue('value').toString(10) : null
        }
    },
    storage: DataTypes.JSON,
    raw: DataTypes.JSON,
    formattedBalanceChanges: {
        type: DataTypes.VIRTUAL,
        get() {
            if (this.tokenBalanceChanges) {
                return this.tokenBalanceChanges.reduce((r, a) => {
                    r[a.token] = r[a.token] || [];
                    r[a.token].push(a);
                    return r;
                }, Object.create(null));
            }
            else
                return {};
        }
    },
    workspaceId: DataTypes.INTEGER,
    state: DataTypes.ENUM('syncing', 'ready'),
    isReady: {
        type: DataTypes.VIRTUAL,
        get() {
            return this.getDataValue('state') === 'ready';
        }
    },
    isSyncing: {
        type: DataTypes.VIRTUAL,
        get() {
            return this.getDataValue('state') === 'syncing';
        }
    }
  }, {
    hooks: {
        afterBulkCreate(transactions, options) {
            return Promise.all(transactions.map(t => t.afterCreate(options)));
        },
        afterCreate(transaction, options) {
            return transaction.afterCreate(options);
        },
        afterSave(transaction, options) {
            return transaction.afterCreate(options);
        }
    },
    sequelize,
    modelName: 'Transaction',
    tableName: 'transactions'
  });
  return Transaction;
};
