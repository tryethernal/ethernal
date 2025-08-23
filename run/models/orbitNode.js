'use strict';
const { Model, Op } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class OrbitNode extends Model {
    static associate(models) {
      OrbitNode.belongsTo(models.Workspace, { foreignKey: 'workspaceId', as: 'workspace' });
      OrbitNode.hasMany(models.OrbitBatch, { foreignKey: 'orbitNodeId', as: 'batches' });
    }

    async confirm({ confirmedBlockHash, confirmedSendRoot }, transaction) {
      const parentNode = await sequelize.models.OrbitNode.findOne({
        where: {
          workspaceId: this.workspaceId,
          nodeNum: this.parentNodeHash
        }
      });

      const previousInboxMaxCount = parentNode ? parentNode.inboxMaxCount : 0;

      const confirmedBatches = await sequelize.models.OrbitBatch.findAll({
        where: {
          workspaceId: this.workspaceId,
          batchSequenceNumber: {
            [Op.lte]: this.inboxMaxCount,
            [Op.gt]: previousInboxMaxCount
          }
        }
      });

      for (const batch of confirmedBatches) {
        await batch.finalize(transaction);
      }

      return this.update({ confirmed: true, confirmedBlockHash, confirmedSendRoot }, { transaction });
    }
  }

  OrbitNode.init({
    workspaceId: DataTypes.INTEGER,
    nodeNum: DataTypes.BIGINT,
    parentNodeHash: DataTypes.STRING,
    nodeHash: DataTypes.STRING,
    executionHash: DataTypes.STRING,
    afterInboxBatchAcc: DataTypes.STRING,
    wasmModuleRoot: DataTypes.STRING,
    inboxMaxCount: DataTypes.BIGINT,
    lastIncludedBatchSequenceNumber: DataTypes.BIGINT,
    confirmed: DataTypes.BOOLEAN,
    rejected: DataTypes.BOOLEAN,
    createdTxHash: DataTypes.STRING,
    confirmedBlockHash: DataTypes.STRING,
    confirmedSendRoot: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'OrbitNode',
    tableName: 'orbit_nodes'
  });

  return OrbitNode;
};