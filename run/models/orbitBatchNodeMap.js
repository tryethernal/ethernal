'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class OrbitBatchNodeMap extends Model {
    static associate(models) {
      OrbitBatchNodeMap.belongsTo(models.Workspace, { foreignKey: 'workspaceId', as: 'workspace' });
      OrbitBatchNodeMap.belongsTo(models.OrbitBatch, { foreignKey: 'batchId', as: 'batch' });
    }
  }

  OrbitBatchNodeMap.init({
    workspaceId: DataTypes.INTEGER,
    batchId: DataTypes.INTEGER,
    nodeNum: DataTypes.BIGINT,
    coverageStatus: DataTypes.ENUM('pending','executed','finalized')
  }, {
    sequelize,
    modelName: 'OrbitBatchNodeMap',
    tableName: 'orbit_batch_node_maps'
  });

  return OrbitBatchNodeMap;
};