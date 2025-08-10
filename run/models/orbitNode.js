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
    parentNodeNum: DataTypes.BIGINT,
    seqNumStart: DataTypes.BIGINT,
    seqNumEnd: DataTypes.BIGINT,
    stateRoot: DataTypes.STRING,
    sendAccumulator: DataTypes.STRING,
    logAccumulator: DataTypes.STRING,
    stakerCount: DataTypes.INTEGER,
    challengeDeadline: DataTypes.DATE,
    confirmed: DataTypes.BOOLEAN,
    rejected: DataTypes.BOOLEAN,
    createdTxHash: DataTypes.STRING,
    createdBlockNumber: DataTypes.BIGINT
  }, {
    sequelize,
    modelName: 'OrbitNode',
    tableName: 'orbit_nodes'
  });

  return OrbitNode;
};