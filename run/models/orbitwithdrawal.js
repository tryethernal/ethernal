'use strict';
const { Model } = require('sequelize');
const moment = require('moment');

module.exports = (sequelize, DataTypes) => {
  class OrbitWithdrawal extends Model {
    static associate(models) {
      OrbitWithdrawal.belongsTo(models.Workspace, { foreignKey: 'workspaceId', as: 'workspace' });
      OrbitWithdrawal.belongsTo(models.Transaction, { foreignKey: 'l2TransactionId', as: 'l2Transaction' });
      OrbitWithdrawal.belongsTo(models.Transaction, { foreignKey: 'l1TransactionId', as: 'l1Transaction' });
    }

    finalize(l1TransactionId, transaction) {
      return this.update({
        l1TransactionId,
        status: 'relayed'
      }, { transaction });
    }
  }

  OrbitWithdrawal.init({
    workspaceId: DataTypes.INTEGER,
    l2TransactionId: DataTypes.INTEGER,
    l1TransactionId: DataTypes.INTEGER,
    status: DataTypes.ENUM('waiting', 'ready', 'relayed'),
    messageNumber: DataTypes.INTEGER,
    to: {
      type: DataTypes.STRING,
      set(value) {
        this.setDataValue('to', value ? value.toLowerCase() : value);
      }
    },
    amount: DataTypes.STRING,
    l1TokenAddress: DataTypes.STRING(42),
    tokenSymbol: DataTypes.STRING,
    tokenDecimals: DataTypes.INTEGER,
    l1TransactionHash: DataTypes.STRING(66),
    l2TransactionHash: DataTypes.STRING(66),
    timestamp: {
      type: DataTypes.DATE,
      set(value) {
        this.setDataValue('timestamp', moment.unix(value).format());
      }
    },
    from: DataTypes.STRING(42),
  }, {
    sequelize,
    modelName: 'OrbitWithdrawal',
    tableName: 'orbit_withdrawals',
    timestamps: false,
  });

  return OrbitWithdrawal;
};
