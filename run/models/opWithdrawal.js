'use strict';
const { Model } = require('sequelize');
const moment = require('moment');

module.exports = (sequelize, DataTypes) => {
  class OpWithdrawal extends Model {
    static associate(models) {
      OpWithdrawal.belongsTo(models.Workspace, { foreignKey: 'workspaceId', as: 'workspace' });
      OpWithdrawal.belongsTo(models.Transaction, { foreignKey: 'l2TransactionId', as: 'l2Transaction' });
      OpWithdrawal.belongsTo(models.Transaction, { foreignKey: 'l1ProofTransactionId', as: 'l1ProofTransaction' });
      OpWithdrawal.belongsTo(models.Transaction, { foreignKey: 'l1FinalizeTransactionId', as: 'l1FinalizeTransaction' });
    }

    prove({ l1ProofTransactionHash, l1ProofTransactionId }, transaction) {
      return this.update({
        l1ProofTransactionHash,
        l1ProofTransactionId,
        status: 'proven',
        provenAt: new Date()
      }, { transaction });
    }

    finalize({ l1FinalizeTransactionHash, l1FinalizeTransactionId }, transaction) {
      return this.update({
        l1FinalizeTransactionHash,
        l1FinalizeTransactionId,
        status: 'finalized',
        finalizedAt: new Date()
      }, { transaction });
    }
  }

  OpWithdrawal.init({
    workspaceId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    withdrawalHash: {
      type: DataTypes.STRING(66),
      allowNull: false,
      comment: 'Unique identifier for the withdrawal',
      set(value) {
        this.setDataValue('withdrawalHash', value ? value.toLowerCase() : value);
      }
    },
    nonce: {
      type: DataTypes.STRING(78),
      allowNull: false,
      comment: 'Global nonce for all withdrawals'
    },
    l2BlockNumber: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    l2TransactionHash: {
      type: DataTypes.STRING(66),
      allowNull: false,
      set(value) {
        this.setDataValue('l2TransactionHash', value ? value.toLowerCase() : value);
      }
    },
    l2TransactionId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    l1ProofTransactionHash: {
      type: DataTypes.STRING(66),
      allowNull: true
    },
    l1ProofTransactionId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    l1FinalizeTransactionHash: {
      type: DataTypes.STRING(66),
      allowNull: true
    },
    l1FinalizeTransactionId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    sender: {
      type: DataTypes.STRING(42),
      allowNull: false,
      set(value) {
        this.setDataValue('sender', value ? value.toLowerCase() : value);
      }
    },
    target: {
      type: DataTypes.STRING(42),
      allowNull: false,
      set(value) {
        this.setDataValue('target', value ? value.toLowerCase() : value);
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
      comment: 'Calldata for the withdrawal execution on L1'
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
    status: {
      type: DataTypes.ENUM('initiated', 'proven', 'finalized'),
      allowNull: false,
      defaultValue: 'initiated'
    },
    provenAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    finalizedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'OpWithdrawal',
    tableName: 'op_withdrawals'
  });

  return OpWithdrawal;
};
