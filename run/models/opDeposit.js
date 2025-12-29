'use strict';
const { Model } = require('sequelize');
const moment = require('moment');

module.exports = (sequelize, DataTypes) => {
  class OpDeposit extends Model {
    static associate(models) {
      OpDeposit.belongsTo(models.Workspace, { foreignKey: 'workspaceId', as: 'workspace' });
      OpDeposit.belongsTo(models.Transaction, { foreignKey: 'l1TransactionId', as: 'l1Transaction' });
      OpDeposit.belongsTo(models.Transaction, { foreignKey: 'l2TransactionId', as: 'l2Transaction' });
    }

    finalize({ l2TransactionId, l2TransactionHash }, transaction) {
      if (!l2TransactionId || !l2TransactionHash)
        throw new Error('Missing parameters');

      return this.update({
        l2TransactionId,
        l2TransactionHash,
        status: 'confirmed'
      }, { transaction });
    }
  }

  OpDeposit.init({
    workspaceId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    l1BlockNumber: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    l1TransactionHash: {
      type: DataTypes.STRING(66),
      allowNull: false
    },
    l1TransactionId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    l2TransactionHash: {
      type: DataTypes.STRING(66),
      allowNull: true,
      comment: 'Derived L2 tx hash, populated when executed on L2'
    },
    l2TransactionId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    from: {
      type: DataTypes.STRING(42),
      allowNull: false,
      set(value) {
        this.setDataValue('from', value ? value.toLowerCase() : value);
      }
    },
    to: {
      type: DataTypes.STRING(42),
      allowNull: true,
      set(value) {
        this.setDataValue('to', value ? value.toLowerCase() : value);
      }
    },
    value: {
      type: DataTypes.STRING(78),
      allowNull: true,
      comment: 'ETH value in wei'
    },
    gasLimit: {
      type: DataTypes.STRING(78),
      allowNull: true
    },
    data: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Calldata for the deposit'
    },
    isCreation: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'True if this deposit creates a contract'
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      set(value) {
        if (typeof value === 'number') {
          this.setDataValue('timestamp', moment.unix(value).format());
        } else {
          this.setDataValue('timestamp', value);
        }
      }
    },
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'failed'),
      allowNull: false,
      defaultValue: 'pending'
    }
  }, {
    sequelize,
    modelName: 'OpDeposit',
    tableName: 'op_deposits'
  });

  return OpDeposit;
};
