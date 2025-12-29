'use strict';
const { Model } = require('sequelize');
const moment = require('moment');

module.exports = (sequelize, DataTypes) => {
  class OpOutput extends Model {
    static associate(models) {
      OpOutput.belongsTo(models.Workspace, { foreignKey: 'workspaceId', as: 'workspace' });
      OpOutput.belongsTo(models.Transaction, { foreignKey: 'l1TransactionId', as: 'l1Transaction' });
    }

    finalize(transaction) {
      return this.update({
        status: 'finalized'
      }, { transaction });
    }
  }

  OpOutput.init({
    workspaceId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    outputIndex: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    outputRoot: {
      type: DataTypes.STRING(66),
      allowNull: false,
      comment: 'Versioned hash of state_root + withdrawal_storage_root + block_hash'
    },
    l2BlockNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'L2 block this output covers'
    },
    l1BlockNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'L1 block where output was proposed'
    },
    l1TransactionHash: {
      type: DataTypes.STRING(66),
      allowNull: false,
      set(value) {
        this.setDataValue('l1TransactionHash', value ? value.toLowerCase() : value);
      }
    },
    l1TransactionId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    proposer: {
      type: DataTypes.STRING(42),
      allowNull: true,
      set(value) {
        this.setDataValue('proposer', value ? value.toLowerCase() : value);
      }
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      set(value) {
        if (typeof value === 'number') {
          this.setDataValue('timestamp', moment.unix(value).toDate());
        } else {
          this.setDataValue('timestamp', value);
        }
      }
    },
    challengePeriodEnds: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when output can be finalized'
    },
    disputeGameAddress: {
      type: DataTypes.STRING(42),
      allowNull: true,
      comment: 'Modern fault proofs: address of the dispute game',
      set(value) {
        this.setDataValue('disputeGameAddress', value ? value.toLowerCase() : value);
      }
    },
    gameType: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Modern fault proofs: type of dispute game'
    },
    status: {
      type: DataTypes.ENUM('proposed', 'challenged', 'resolved', 'finalized'),
      allowNull: false,
      defaultValue: 'proposed'
    }
  }, {
    sequelize,
    modelName: 'OpOutput',
    tableName: 'op_outputs'
  });

  return OpOutput;
};
