'use strict';
const {
  Model,
  Sequelize
} = require('sequelize');

const Op = Sequelize.Op
const { sanitize, stringifyBns } = require('../lib/utils');
const { enqueue } = require('../lib/queue');
const { trigger } = require('../lib/pusher');
let { getTransactionMethodDetails } = require('../lib/abi');
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
      Transaction.hasMany(models.TokenTransfer, { foreignKey: 'transactionId', as: 'tokenTransfers' });
      Transaction.hasMany(models.TokenBalanceChange, { foreignKey: 'transactionId', as: 'tokenBalanceChanges' });
      Transaction.hasMany(models.TransactionTraceStep, { foreignKey: 'transactionId', as: 'traceSteps' });
    }

    async safeCreateReceipt(receipt) {
        if (!receipt) throw new Error('Missing parameter');

        return sequelize.transaction(async transaction => {
            await this.update({ state: 'ready' }, { transaction });
            return this.createReceipt(stringifyBns(sanitize({
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
                transactionHash: receipt.transactionHash === undefined ? receipt.hash : receipt.transactionHash,
                transactionIndex: receipt.transactionIndex === undefined ? receipt.index : receipt.transactionIndex,
                type: receipt.type,
                raw: receipt
            })), { transaction });
        });
    }

    getFilteredTokenTransfers(page = 1, itemsPerPage = 10, order = 'DESC', orderBy = 'id') {
        return sequelize.models.TokenTransfer.findAll({
            where: { transactionId: this.id },
            include: {
                model: sequelize.models.Contract,
                as: 'contract',
                attributes: ['tokenSymbol', 'tokenDecimals', 'isToken', 'patterns', 'name', 'tokenName']
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

    safeCreateTransactionTrace(steps) {
        return sequelize.transaction(async transaction => {
            const promises = [];
            const existingSteps = await this.getTraceSteps();

            for (let i = 0; i < existingSteps.length; i++)
                promises.push(existingSteps[i].destroy({ transaction }));

            for (let i = 0; i < steps.length; i++) {
                const step = steps[i];
                promises.push(this.createTraceStep({
                    value: step.value,
                    address: step.address,
                    contractHashedBytecode: step.contractHashedBytecode,
                    depth: step.depth,
                    input: step.input,
                    op: step.op,
                    returnData: step.returnData,
                    workspaceId: this.workspaceId
                }, { transaction }));
            }
            return Promise.all(promises);
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
    value: DataTypes.STRING,
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
        async afterCreate(transactionInstance, options) {
            const afterCreateFn = async () => {
                const workspace = await transactionInstance.getWorkspace();
                if (workspace.public && workspace.tracing == 'other')
                    await enqueue('processTransactionTrace', `processTransactionTrace-${transactionInstance.workspaceId}-${transactionInstance.hash}`, {
                        transactionId: transactionInstance.id
                    }, 1);
            };
            if (options.transaction)
                return options.transaction.afterCommit(afterCreateFn);
            else
                return afterCreateFn();
        },
        async afterSave(transaction, options) {
            const afterSaveFn = async () => {
                await trigger(`private-transactions;workspace=${transaction.workspaceId}`, 'new', { hash: transaction.hash, state: transaction.state });
                if (transaction.to)
                    await trigger(`private-transactions;workspace=${transaction.workspaceId};address=${transaction.to}`, 'new', { hash: transaction.hash });
                return trigger(`private-transactions;workspace=${transaction.workspaceId};address=${transaction.from}`, 'new', { hash: transaction.hash });
            };
            if (options.transaction)
                return options.transaction.afterCommit(afterSaveFn);
            else
                return afterSaveFn();
        }
    },
    sequelize,
    modelName: 'Transaction',
    tableName: 'transactions'
  });
  return Transaction;
};