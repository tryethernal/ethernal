'use strict';
const {
  Model,
  Sequelize
} = require('sequelize');
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
    sequelize,
    modelName: 'TransactionLog',
    tableName: 'transaction_logs'
  });
  return TransactionLog;
};