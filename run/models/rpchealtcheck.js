'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RpcHealthCheck extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      RpcHealthCheck.belongsTo(models.Workspace, { foreignKey: 'workspaceId', as: 'workspace' });
    }

    increaseFailedAttempts() {
      return this.increment('failedAttempts');
    }

    resetFailedAttempts() {
      return this.update({ failedAttempts: 0 });
    }
  }
  RpcHealthCheck.init({
    workspaceId: DataTypes.INTEGER,
    isReachable: DataTypes.BOOLEAN,
    failedAttempts: DataTypes.INTEGER,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  }, {
    sequelize,
    modelName: 'RpcHealthCheck',
    tableName: 'rpc_health_checks'
  });
  return RpcHealthCheck;
};
