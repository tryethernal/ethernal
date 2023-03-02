'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Explorer extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Explorer.belongsTo(models.User, { foreignKey: 'userId', as: 'admin' });
      Explorer.belongsTo(models.Workspace, { foreignKey: 'workspaceId', as: 'workspace' });
    }

    static findBySlug(slug) {
        return Explorer.findOne({
            where: {
                slug: slug
            },
            include: [
                {
                    model: sequelize.models.User,
                    attributes: ['firebaseUserId'],
                    as: 'admin'
                },
                {
                    model: sequelize.models.Workspace,
                    attributes: ['name', 'storageEnabled', 'defaultAccount', 'gasPrice', 'gasLimit', 'erc721LoadingEnabled'],
                    as: 'workspace'
                }
            ]
        });
    }

    static findByDomain(domain) {
        return Explorer.findOne({
            where: {
                domain: domain
            },
            include: [
                {
                    model: sequelize.models.User,
                    attributes: ['firebaseUserId'],
                    as: 'admin'
                },
                {
                    model: sequelize.models.Workspace,
                    attributes: ['name', 'storageEnabled', 'defaultAccount', 'gasPrice', 'gasLimit', 'erc721LoadingEnabled'],
                    as: 'workspace'
                }
            ]
        });
    }
  }
  Explorer.init({
    userId: DataTypes.INTEGER,
    workspaceId: DataTypes.INTEGER,
    chainId: DataTypes.INTEGER,
    domain: DataTypes.STRING,
    name: DataTypes.STRING,
    rpcServer: DataTypes.STRING,
    slug: DataTypes.STRING,
    themes: DataTypes.JSON,
    token: DataTypes.STRING,
    totalSupply: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Explorer',
    tableName: 'explorers'
  });
  return Explorer;
};