'use strict';
const {
  Model
} = require('sequelize');
const { trigger } = require('../lib/pusher');
const { enqueue } = require('../lib/queue');
const moment = require('moment');

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
            if (this.getDataValue('from'))
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
        async afterCreate(receipt, options) {
            const fullTransaction = await receipt.getTransaction({
                attributes: ['hash', 'id', 'workspaceId', 'rawError', 'parsedError', 'to', 'data', 'blockNumber', 'from', 'gasLimit', 'gasPrice', 'type', 'value'],
                include: [
                    {
                        model: sequelize.models.Workspace,
                        as: 'workspace',
                        attributes: ['id', 'name', 'public', 'userId'],
                        include: {
                          model: sequelize.models.User,
                          as: 'user',
                          attributes: ['firebaseUserId', 'id']
                        }
                    },
                    {
                        model: sequelize.models.TransactionReceipt,
                        as: 'receipt',
                        attributes: ['status']
                    }
                ]
            });

            // Here is the stuff that we only want to do once everything has been created (typically notifications & jobs queuing)
            const afterCommitFn = async () => {
                if (receipt.status == 0 && fullTransaction.workspace.public)
                    await enqueue('processTransactionError', `processTransactionError-${fullTransaction.workspaceId}-${fullTransaction.hash}`, { transactionId: fullTransaction.id }, 1);

                if (!fullTransaction.workspace.public && !fullTransaction.rawError && !fullTransaction.parsedError && fullTransaction.receipt && !fullTransaction.receipt.status)
                    trigger(`private-failedTransactions;workspace=${fullTransaction.workspaceId}`, 'new', fullTransaction.toJSON());
            }

            // We finish creating stuff here to make sure we can put it in the transaction if applicable
            if (!fullTransaction.to && receipt.contractAddress) {
                const workspace = fullTransaction.workspace;
                const canCreateContract = await workspace.canCreateContract();
                if (canCreateContract)
                    await workspace.safeCreateOrUpdateContract({
                        address: receipt.contractAddress,
                        timestamp: moment(fullTransaction.timestamp).unix()
                    }, options.transaction);
            }

            if (options.transaction) {
                return options.transaction.afterCommit(afterCommitFn);
            } else
                return afterCommitFn();
        }
    },
    sequelize,
    modelName: 'TransactionReceipt',
    tableName: 'transaction_receipts'
  });
  return TransactionReceipt;
};
