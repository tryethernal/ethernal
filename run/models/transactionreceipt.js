'use strict';
const {
  Model
} = require('sequelize');
const { trigger } = require('../lib/pusher');
module.exports = (sequelize, DataTypes) => {
  class TransactionReceipt extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      TransactionReceipt.belongsTo(models.Transaction, { foreignKey: 'transactionId', as: 'transaction' });
      TransactionReceipt.hasMany(models.TransactionLog, { foreignKey: 'transactionReceiptId', as: 'logs' });
    }
  }
  TransactionReceipt.init({
    blockHash: DataTypes.STRING,
    blockNumber: DataTypes.INTEGER,
    byzantium: DataTypes.BOOLEAN,
    confirmations: DataTypes.INTEGER,
    contractAddress: DataTypes.STRING,
    cumulativeGasUsed: DataTypes.STRING,
    from: {
        type: DataTypes.STRING,
        set(value) {
            this.setDataValue('from', value.toLowerCase());
        }
    },
    gasUsed: DataTypes.STRING,
    logsBloom: DataTypes.STRING,
    status: DataTypes.BOOLEAN,
    to: {
        type: DataTypes.STRING,
        set(value) {
            this.setDataValue('to', value.toLowerCase());
        }
    },
    transactionHash: DataTypes.STRING,
    transactionIndex: DataTypes.INTEGER,
    type: DataTypes.INTEGER,
    transactionId: DataTypes.INTEGER,
    raw: DataTypes.JSON
  }, {
    hooks: {
        async afterSave(receipt, options) {
            const fullTransaction = await receipt.getTransaction({
                attributes: ['hash', 'workspaceId', 'rawError', 'parsedError', 'to', 'data', 'blockNumber'],
                include: [
                    {
                        model: sequelize.models.Workspace,
                        as: 'workspace',
                        attributes: ['id', 'public']
                    },
                    {
                        model: sequelize.models.TransactionReceipt,
                        as: 'receipt',
                        attributes: ['status']
                    }
                ]
            });
            if (!fullTransaction.workspace.public && !fullTransaction.rawError && !fullTransaction.parsedError && fullTransaction.receipt && !fullTransaction.receipt.status)
                trigger(`private-failedTransactions;workspace=${fullTransaction.workspaceId}`, 'new', fullTransaction.toJSON());
        }
    },
    sequelize,
    modelName: 'TransactionReceipt',
    tableName: 'transaction_receipts'
  });
  return TransactionReceipt;
};