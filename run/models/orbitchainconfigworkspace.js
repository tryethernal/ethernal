'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class OrbitChainConfigWorkspace extends Model {
    static associate(models) {
      OrbitChainConfigWorkspace.belongsTo(models.OrbitChainConfig, { foreignKey: 'orbitChainConfigId', as: 'orbitChainConfig' });
      OrbitChainConfigWorkspace.belongsTo(models.Workspace, { foreignKey: 'workspaceId', as: 'workspace' });
    }
  }

  OrbitChainConfigWorkspace.init({
    orbitChainConfigId: DataTypes.INTEGER,
    workspaceId: DataTypes.INTEGER,
    parentChainBlockValidationType: DataTypes.ENUM('latest', 'safe', 'finalized'),
  }, {
    sequelize,
    modelName: 'OrbitChainConfigWorkspace',
    tableName: 'orbit_chain_configs_workspaces'
  });

  return OrbitChainConfigWorkspace;
};