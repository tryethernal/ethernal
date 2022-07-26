'use strict';
const {
  Model
} = require('sequelize');
const { sanitize } = require('../lib/utils');
const writeLog = require('../lib/writeLog');

module.exports = (sequelize, DataTypes) => {
  class Transaction extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Transaction.belongsTo(models.Workspace, { foreignKey: 'workspaceId', as: 'workspace' });
      Transaction.hasOne(models.TransactionReceipt, { foreignKey: 'transactionId', as: 'receipt' });
      Transaction.hasMany(models.TokenTransfer, { foreignKey: 'transactionId', as: 'tokenTransfers' });
      Transaction.hasMany(models.TokenBalanceChange, { foreignKey: 'transactionId', as: 'tokenBalanceChanges' });
      Transaction.hasMany(models.TransactionTraceStep, { foreignKey: 'transactionId', as: 'TransactionTraceSteps' });
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
            dst: tokenTransfer.dst,
            src: tokenTransfer.src,
            amount: tokenTransfer.amount,
            token: tokenTransfer.token
        }));
    }

    updateFailedTransactionError(error) {
        return this.update({
            parsedError: error.parsed ? error.message : null,
            rawError: error.parsed ? null :  error.message
        });
    }

    safeCreateTokenBalanceChange(balanceChange) {
        console.log(balanceChange)
        return this.createTokenBalanceChange(sanitize({
            token: balanceChange.token,
            address: balanceChange.address,
            currentBalance: balanceChange.currentBalance,
            previousBalance: balanceChange.previousBalance,
            diff: balanceChange.diff
        }));
    }

    safeUpdateStorage(data) {
        return this.update({
            storage: data
        });
    }

    safeCreateTransactionTraceStep(step) {
        return this.createTransactionTraceStep({
            address: step.address,
            contractHashedBytecode: step.contractHashedBytecode,
            depth: step.depth,
            input: step.input,
            op: step.op,
            returnData: step.returnData
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
    from: DataTypes.STRING,
    gasLimit: DataTypes.STRING,
    gasPrice: DataTypes.STRING,
    hash: DataTypes.STRING,
    methodLabel: DataTypes.STRING,
    methodName: DataTypes.STRING,
    methodSignature: DataTypes.STRING,
    nonce: DataTypes.INTEGER,
    r: DataTypes.STRING,
    s: DataTypes.STRING,
    timestamp: DataTypes.STRING,
    to: DataTypes.STRING,
    transactionIndex: DataTypes.INTEGER,
    type: DataTypes.INTEGER,
    v: DataTypes.INTEGER,
    value: DataTypes.STRING,
    storage: DataTypes.JSON,
    raw: DataTypes.JSON
  }, {
    hooks: {
        afterSave(instance, options) {
            // writeLog({ message: instance });
            // writeLog({ message: options });
        }
    },
    sequelize,
    modelName: 'Transaction',
    tableName: 'transactions'
  });
  return Transaction;
};