'use strict';
const {
  Model
} = require('sequelize');
const ethers = require('ethers');
const BigNumber = ethers.BigNumber;
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
        TransactionReceipt.hasMany(models.TransactionLog, { foreignKey: 'transactionReceiptId', as: 'logs' });
        TransactionReceipt.belongsTo(models.Transaction, { foreignKey: 'transactionId', as: 'transaction' });
        TransactionReceipt.belongsTo(models.Workspace, { foreignKey: 'workspaceId', as: 'workspace' });
    }

    async insertAnalyticEvent(sequelizeTransaction) {
        const transaction = await this.getTransaction();
        const gasPrice = this.raw.effectiveGasPrice || this.raw.gasPrice || transaction.gasPrice;
        const transactionFee = BigNumber.from(this.gasUsed.toString()).mul(BigNumber.from(gasPrice.toString()));

        return sequelize.models.TransactionEvent.create({
            workspaceId: this.workspaceId,
            transactionId: transaction.id,
            blockNumber: this.blockNumber,
            timestamp: transaction.timestamp,
            transactionFee: transactionFee.toString(),
            gasPrice: BigNumber.from(gasPrice).toString(),
            gasUsed: BigNumber.from(this.gasUsed).toString(),
            from: this.from,
            to: this.to
        }, { transaction: sequelizeTransaction });
    }

    async safeDestroy(transaction) {
        const logs = await this.getLogs();
        for (let i = 0; i < logs.length; i++) {
            await logs[i].safeDestroy(transaction);
        }
        return this.destroy({ transaction });
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
    workspaceId: DataTypes.INTEGER,
    raw: DataTypes.JSON
  }, {
    hooks: {
        async afterCreate(receipt, options) {
            const transaction = await sequelize.models.Transaction.findByPk(receipt.transactionId, { include: 'workspace' });

            // Here is the stuff that we only want to do once everything has been created (typically notifications & jobs queuing)
            const afterCommitFn = async () => {
                if (receipt.status == 0) {
                    await enqueue('processTransactionError', `processTransactionError-${receipt.workspaceId}-${receipt.transactionHash}`, { transactionId: receipt.transactionId }, 1);
                    trigger(`private-failedTransactions;workspace=${receipt.workspaceId}`, 'new', receipt.toJSON());
                }

                return transaction.triggerEvents();
            }

            // We finish creating stuff here to make sure we can put it in the transaction if applicable
            if (receipt.contractAddress) {
                const canCreateContract = await transaction.workspace.canCreateContract();
                if (canCreateContract)
                    await transaction.workspace.safeCreateOrUpdateContract({
                        address: receipt.contractAddress,
                        transactionId: receipt.transactionId
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
