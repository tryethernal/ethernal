'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class IntegrityCheck extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      IntegrityCheck.belongsTo(models.Workspace, { foreignKey: 'workspaceId', as: 'workspace' });
      IntegrityCheck.belongsTo(models.Block, { foreignKey: 'blockId', as: 'block' });
    }
  }

  IntegrityCheck.init({
    workspaceId: DataTypes.INTEGER,
    blockId: DataTypes.INTEGER,
    status: DataTypes.ENUM('healthy', 'recovering'),
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
    isRecovering: {
        type: DataTypes.VIRTUAL,
        get() {
            return this.getDataValue('status') == 'recovering';
        }
    },
    isHealthy: {
        type: DataTypes.VIRTUAL,
        get() {
            return this.getDataValue('status') == 'healthy';
        }
    },
  }, {
    sequelize,
    modelName: 'IntegrityCheck',
    tableName: 'integrity_checks'
  });
  return IntegrityCheck;
};
