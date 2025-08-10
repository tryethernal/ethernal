'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class OrbitNode extends Model {
    static associate(models) {
      OrbitNode.belongsTo(models.Workspace, { foreignKey: 'workspaceId', as: 'workspace' });
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