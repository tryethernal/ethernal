'use strict';
const {
  Model
} = require('sequelize');
const MAX_FAILED_RPC_ATTEMPTS = 3;

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

    tooManyFailedAttempts() {
      return this.failedAttempts > MAX_FAILED_RPC_ATTEMPTS;
    }
  }
  RpcHealthCheck.init({
    workspaceId: DataTypes.INTEGER,
    isReachable: DataTypes.BOOLEAN,
    failedAttempts: DataTypes.INTEGER,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  }, {
    hooks: {
      afterUpdate(rpcHealthCheck, options) {
        const afterUpdateFn = async () => {
          if (rpcHealthCheck.failedAttempts > 2) {
            const workspace = await rpcHealthCheck.getWorkspace({ include: 'explorer' });
            return workspace.explorer.stopSync();
          }
        };
        return options.transaction ? options.transaction.afterCommit(afterUpdateFn) : afterUpdateFn();
      }
    },
    sequelize,
    modelName: 'RpcHealthCheck',
    tableName: 'rpc_health_checks'
  });
  return RpcHealthCheck;
};
