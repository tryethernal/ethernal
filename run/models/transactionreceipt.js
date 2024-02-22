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
    }

    async insertAnalyticEvent(sequelizeTransaction) {
        const transaction = await this.getTransaction();
        const gasPrice = this.raw.effectiveGasPrice || this.raw.gasPrice || transaction.gasPrice;
        const transactionFee = BigNumber.from(this.gasUsed).mul(BigNumber.from(gasPrice));

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
                        include: [
                            {
                                model: sequelize.models.User,
                                as: 'user',
                                attributes: ['firebaseUserId', 'id']
                            },
                            {
                                model: sequelize.models.Explorer,
                                as: 'explorer',
                                include: {
                                    model: sequelize.models.StripeSubscription,
                                    as: 'stripeSubscription'
                                }
                            }
                        ]
                    }
                ]
            });

            // Here is the stuff that we only want to do once everything has been created (typically notifications & jobs queuing)
            const afterCommitFn = async () => {
                const explorer = fullTransaction.workspace.explorer;
                if (!explorer)
                    return;

                const isExplorerActive = await explorer.isActive();
                if (!isExplorerActive)
                    return;

                if (receipt.status == 0) {
                    await enqueue('processTransactionError', `processTransactionError-${fullTransaction.workspaceId}-${fullTransaction.hash}`, { transactionId: fullTransaction.id }, 1);
                    if (!fullTransaction.rawError && !fullTransaction.parsedError)
                        trigger(`private-failedTransactions;workspace=${fullTransaction.workspaceId}`, 'new', fullTransaction.toJSON());
                }

                return fullTransaction.triggerEvents();
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
            await receipt.insertAnalyticEvent(options.transaction);

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
