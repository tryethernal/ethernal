'use strict';
const {
  Model,
  Sequelize
} = require('sequelize');
const { getTokenTransfer } = require('../lib/abi');
const { sanitize } = require('../lib/utils');
const Op = Sequelize.Op;
module.exports = (sequelize, DataTypes) => {
  class TransactionLog extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      TransactionLog.belongsTo(models.TransactionReceipt, { foreignKey: 'transactionReceiptId', as: 'receipt' });
      TransactionLog.belongsTo(models.Workspace, { foreignKey: 'workspaceId', as: 'workspace' });
      TransactionLog.hasOne(models.Contract, {
          sourceKey: 'address',
          foreignKey:  'address',
          as: 'contract',
          scope: {
            [Op.and]: sequelize.where(sequelize.col("TransactionLog.workspaceId"),
                Op.eq,
                sequelize.col("contract.workspaceId")
              ),
            },
          constraints: false
      });
      TransactionLog.hasOne(models.TokenTransfer, { foreignKey: 'transactionLogId', as: 'tokenTransfer' });
    }

    async safeCreateTokenTransfer(tokenTransfer) {
        const existingTokenTransferCount = await sequelize.models.TokenTransfer.count({
            where: { transactionLogId: this.id }
        });

        if (existingTokenTransferCount > 0)
            return;

        const transactionReceipt = await this.getReceipt();
        const sanitizedTokenTransfer = sanitize({
            amount: tokenTransfer.amount,
            dst: tokenTransfer.dst,
            src: tokenTransfer.src,
            token: tokenTransfer.token,
            tokenId: tokenTransfer.tokenId,
            transactionId: transactionReceipt.transactionId,
            workspaceId: this.workspaceId
        });
        return this.createTokenTransfer(sanitizedTokenTransfer);
    }
  }
  TransactionLog.init({
    workspaceId: DataTypes.INTEGER,
    transactionReceiptId: DataTypes.INTEGER,
    address: {
        type: DataTypes.STRING,
        set(value) {
            this.setDataValue('address', value.toLowerCase());
        }
    },
    blockHash: DataTypes.STRING,
    blockNumber: DataTypes.INTEGER,
    data: DataTypes.STRING,
    logIndex: DataTypes.INTEGER,
    topics: DataTypes.ARRAY(DataTypes.STRING),
    transactionHash: DataTypes.STRING,
    transactionIndex: DataTypes.INTEGER,
    raw: DataTypes.JSON
  }, {
    hooks: {
        async afterSave(log, options) {
            const tokenTransfer = getTokenTransfer(log);
            if (tokenTransfer)
                return await log.safeCreateTokenTransfer(tokenTransfer);
        }
    },
    sequelize,
    modelName: 'TransactionLog',
    tableName: 'transaction_logs'
  });
  return TransactionLog;
};