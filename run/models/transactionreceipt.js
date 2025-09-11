'use strict';
const {
  Model
} = require('sequelize');
const ethers = require('ethers');
const BigNumber = ethers.BigNumber;
const { trigger } = require('../lib/pusher');
const { enqueue } = require('../lib/queue');

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
        TransactionReceipt.hasOne(models.Contract, {
            sourceKey: 'contractAddress',
            foreignKey:  'address',
            as: 'createdContract',
            constraints: false
        });
    }

    async insertAnalyticEvent(sequelizeTransaction) {
        const transaction = await this.getTransaction();
        const gasPrice = this.effectiveGasPrice || this.raw.gasPrice || transaction.gasPrice;
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

    async afterCreate(options) {
        const transaction = await sequelize.models.Transaction.findByPk(this.transactionId, { include: 'workspace' });

        // Here is the stuff that we only want to do once everything has been created (typically notifications & jobs queuing)
        const afterCommitFn = async () => {
            if (this.status == 0) {
                await enqueue('processTransactionError', `processTransactionError-${this.workspaceId}-${this.transactionHash}`, { transactionId: this.transactionId }, 1);
                trigger(`private-failedTransactions;workspace=${this.workspaceId}`, 'new', this.toJSON());
            }

            return transaction.triggerEvents();
        }

        // We finish creating stuff here to make sure we can put it in the transaction if applicable
        if (this.contractAddress) {
            const canCreateContract = await transaction.workspace.canCreateContract();
            if (canCreateContract)
                await transaction.workspace.safeCreateOrUpdateContract({
                    address: this.contractAddress,
                    transactionId: this.transactionId
                }, options.transaction);
        }

        if (options.transaction) {
            return options.transaction.afterCommit(afterCommitFn);
        } else
            return afterCommitFn();
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
    blobGasUsed: {
        type: DataTypes.STRING,
        get() {
            this.getDataValue('blobGasUsed') || this.getDataValue('raw.blobGasUsed') ?
                String(this.getDataValue('blobGasUsed') || this.getDataValue('raw.blobGasUsed')) :
                null;
        }
    },
    blobGasPrice: {
        type: DataTypes.STRING,
        get() {
            this.getDataValue('blobGasPrice') || this.getDataValue('raw.blobGasPrice') ?
                String(this.getDataValue('blobGasPrice') || this.getDataValue('raw.blobGasPrice')) :
                null;
        }
    },
    timeboosted: {
        type: DataTypes.BOOLEAN,
        get() {
            this.getDataValue('timeboosted') || this.getDataValue('raw.timeboosted') ?
                String(this.getDataValue('timeboosted') || this.getDataValue('raw.timeboosted')) :
                null;
        }
    },
    gasUsedForL1: {
        type: DataTypes.STRING,
        get() {
            this.getDataValue('gasUsedForL1') || this.getDataValue('raw.gasUsedForL1') ?
                String(this.getDataValue('gasUsedForL1') || this.getDataValue('raw.gasUsedForL1')) :
                null;
        }
    },
    effectiveGasPrice: {
        type: DataTypes.STRING,
        get() {
            this.getDataValue('effectiveGasPrice') || this.getDataValue('raw.effectiveGasPrice') ?
                String(this.getDataValue('effectiveGasPrice') || this.getDataValue('raw.effectiveGasPrice')) :
                null;
        }
    },
    raw: DataTypes.JSON
  }, {
    hooks: {
        afterBulkCreate(receipts, options) {
            return Promise.all(receipts.map(r => r.afterCreate(options)));
        },
        afterCreate(receipt, options) {
            return receipt.afterCreate(options);
        }
    },
    sequelize,
    modelName: 'TransactionReceipt',
    tableName: 'transaction_receipts'
  });
  return TransactionReceipt;
};
