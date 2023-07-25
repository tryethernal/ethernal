'use strict';
const {
  Model
} = require('sequelize');
const { enqueue } = require('../lib/queue');

module.exports = (sequelize, DataTypes) => {
  class ExplorerDomain extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
        ExplorerDomain.belongsTo(models.Explorer, { foreignKey: 'explorerId', as: 'explorer' });
    }
  }
  ExplorerDomain.init({
    explorerId: DataTypes.INTEGER,
    domain: {
        type: DataTypes.STRING,
        set(value) {
            this.setDataValue('domain', value.toLowerCase());
        }
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  }, {
    hooks: {
        afterCreate(explorerDomain) {
            return enqueue('updateApproximatedRecord', `updateApproximatedRecord-${explorerDomain.id}-${explorerDomain.domain}`, { explorerDomain });
        },
        afterDestroy(explorerDomain) {
            return enqueue('updateApproximatedRecord', `updateApproximatedRecord-${explorerDomain.id}-${explorerDomain.domain}`, { explorerDomain });
        }
    },
    sequelize,
    modelName: 'ExplorerDomain',
    tableName: 'explorer_domains'
  });
  return ExplorerDomain;
};
