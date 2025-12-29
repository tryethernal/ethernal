'use strict';
const { Model } = require('sequelize');
const moment = require('moment');

module.exports = (sequelize, DataTypes) => {
  class OpBatch extends Model {
    static associate(models) {
      OpBatch.belongsTo(models.Workspace, { foreignKey: 'workspaceId', as: 'workspace' });
      OpBatch.belongsTo(models.Transaction, { foreignKey: 'l1TransactionId', as: 'l1Transaction' });
    }
  }

  OpBatch.init({
    workspaceId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    batchIndex: {
      type: DataTypes.INTEGER,
      allowNull: true
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
    l1TransactionIndex: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    epochNumber: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'L1 block the batch references'
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
    txCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Number of L2 transactions in batch'
    },
    l2BlockStart: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'First L2 block in batch'
    },
    l2BlockEnd: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Last L2 block in batch'
    },
    blobHash: {
      type: DataTypes.STRING(66),
      allowNull: true,
      comment: 'EIP-4844 blob hash if batch uses blobs'
    },
    blobData: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Parsed blob content for L2 block extraction'
    },
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'finalized'),
      allowNull: false,
      defaultValue: 'pending'
    }
  }, {
    sequelize,
    modelName: 'OpBatch',
    tableName: 'op_batches'
  });

  return OpBatch;
};
