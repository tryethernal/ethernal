'use strict';
const {
  Model,
  Sequelize
} = require('sequelize');

const Op = Sequelize.Op
const { sanitize } = require('../lib/utils');
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

    async safeCreateTokenBalanceChange(balanceChange) {
        const existingRecords = await this.getTokenBalanceChanges({
            where: {
                token: balanceChange.token,
                address: balanceChange.address
            }
        });
        if (existingRecords.length > 0)
            return null;

        return this.createTokenBalanceChange(sanitize({
            token: balanceChange.token,
            address: balanceChange.address,
            currentBalance: balanceChange.currentBalance,
            previousBalance: balanceChange.previousBalance,
            diff: balanceChange.diff,
            workspaceId: this.workspaceId
        }));
    }

    safeUpdateStorage(data) {
        return this.update({
            storage: data
        });
    }

    safeCreateTransactionTraceStep(step) {
        return this.createTraceStep({
            address: step.address,
            contractHashedBytecode: step.contractHashedBytecode,
            depth: step.depth,
            input: step.input,
            op: step.op,
            returnData: step.returnData,
            workspaceId: this.workspaceId
        });
    }
  }
  Transaction.init({
    blockHash: DataTypes.STRING,
    blockNumber: DataTypes.INTEGER,
    blockId: DataTypes.INTEGER,
    chainId: DataTypes.INTEGER,
    confirmations: DataTypes.INTEGER,
    creates: DataTypes.STRING,
    data: DataTypes.STRING,
    parsedError: DataTypes.STRING,
    rawError: DataTypes.JSON,
    from: {
        type: DataTypes.STRING,
        set(value) {
            this.setDataValue('from', value.toLowerCase());
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
                    r[a.token] = r[a.token] || [];
                    r[a.token].push(a);
                    return r;
                }, Object.create(null));
            }
            else
                return {};
        }
    },
    workspaceId: DataTypes.INTEGER
  }, {
    hooks: {
        afterSave(transaction, options) {
            trigger(`private-transactions;workspace=${transaction.workspaceId}`, 'new', null);
            if (transaction.to)
                trigger(`private-transactions;workspace=${transaction.workspaceId};address=${transaction.to}`, 'new', null);
            trigger(`private-transactions;workspace=${transaction.workspaceId};address=${transaction.from}`, 'new', null);
        }
    },
    sequelize,
    modelName: 'Transaction',
    tableName: 'transactions'
  });
  return Transaction;
};