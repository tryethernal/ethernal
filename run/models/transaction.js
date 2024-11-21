'use strict';
const {
  Model,
  Sequelize
} = require('sequelize');
const ethers = require('ethers');
const Op = Sequelize.Op
const { sanitize, stringifyBns, processRawRpcObject } = require('../lib/utils');
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
      Transaction.hasOne(models.TransactionReceipt, { foreignKey: 'transactionId', as: 'receipt' });
      Transaction.hasOne(models.TransactionEvent, { foreignKey: 'transactionId', as: 'event' });
      Transaction.hasMany(models.TokenTransfer, { foreignKey: 'transactionId', as: 'tokenTransfers' });
      Transaction.hasMany(models.TokenBalanceChange, { foreignKey: 'transactionId', as: 'tokenBalanceChanges' });
      Transaction.hasMany(models.TransactionTraceStep, { foreignKey: 'transactionId', as: 'traceSteps' });
    }

    async safeDestroy(transaction) {
        const receipt = await this.getReceipt();
        if (receipt)
            await receipt.safeDestroy(transaction);

        const traceSteps = await this.getTraceSteps();
        for (let i = 0; i < traceSteps.length; i++)
            await traceSteps[i].destroy(transaction);

        const event = await this.getEvent();
        if (event)
            await event.destroy({ transaction });
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
                    individualHooks: true,
                    returning: true,
                    transaction
                }
            );

            if (!storedReceipt)
                throw new Error('Could not create receipt');

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
                if (tokenTransfer)
                    tokenTransfers.push(sanitize({
                        transactionId: this.id,
                        transactionLogId: log.id,
                        workspaceId: this.workspaceId,
                        ...tokenTransfer
                    }));
            }

            if (tokenTransfers.length > 0) {
                const storedTokenTransfers = await sequelize.models.TokenTransfer.bulkCreate(tokenTransfers, {
                    ignoreDuplicates: true,
                    returning: true,
                    individualHooks: true,
                    transaction
                });
                for (let i = 0; i < storedTokenTransfers.length; i++)
                    trigger(`private-contractLog;workspace=${this.workspaceId};contract=${tokenTransfers[i].address}`, 'new', null);

                const events = [];
                for (let i = 0; i < storedTokenTransfers.length; i++) {
                    const tokenTransfer = storedTokenTransfers[i];
                    const contract = await sequelize.models.Contract.findOne({
                        where: {
                            workspaceId: this.workspaceId,
                            address: tokenTransfer.token
                        }
                    });
                    if (!contract) {
                        const workspace = await this.getWorkspace();
                        await workspace.safeCreateOrUpdateContract({
                            address: tokenTransfer.token,
                            timestamp: moment(this.timestamp).unix()
                        }, transaction);
                    }

                    events.push({
                        workspaceId: this.workspaceId,
                        tokenTransferId: tokenTransfer.id,
                        blockNumber: receipt.blockNumber,
                        timestamp: this.timestamp,
                        amount: ethers.BigNumber.from(tokenTransfer.amount).toString(),
                        token: tokenTransfer.token,
                        tokenType: contract ? contract.patterns[0] : null,
                        src: tokenTransfer.src,
                        dst: tokenTransfer.dst
                    });
                }

                if (events.length > 0)
                    await sequelize.models.TokenTransferEvent.bulkCreate(events, {
                        ignoreDuplicates: true,
                        returning: true,
                        transaction
                    });
            }

            await storedReceipt.insertAnalyticEvent(transaction);

            return storedReceipt;
        });
    }

    getFilteredTokenTransfers(page = 1, itemsPerPage = 10, order = 'DESC', orderBy = 'id') {
        return sequelize.models.TokenTransfer.findAll({
            where: { transactionId: this.id },
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
    }

    countTokenTransfers() {
        return sequelize.models.TokenTransfer.count({
            where: { transactionId: this.id }
        });
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

            const augmentedSteps = steps.map(step => ({
                ...step,
                workspaceId: this.workspaceId,
                timestamp: this.timestamp,
                transactionId: this.id
            }));

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
        async afterCreate(transaction, options) {
            const afterCommitFn = () => {
                return transaction.triggerEvents();
            };

            if (options.transaction)
                return options.transaction.afterCommit(afterCommitFn);
            else
                return afterCommitFn();
        },
        async afterSave(transaction, options) {
            const afterCommitFn = () => {
                return transaction.triggerEvents();
            };

            if (options.transaction)
                return options.transaction.afterCommit(afterCommitFn);
            else
                return afterCommitFn();
        }
    },
    sequelize,
    modelName: 'Transaction',
    tableName: 'transactions'
  });
  return Transaction;
};
