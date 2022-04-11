'use strict';
const {
  Model
} = require('sequelize');

const { Workspace } = require('./index');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      User.hasMany(models.Workspace, { foreignKey: 'userId', as: 'workspaces' });
    }

    static findByAuthId(firebaseUserId) {
        return User.findOne({
            where: {
                firebaseUserId: firebaseUserId
            },
            include: 'workspaces'
        });
    }

    static async findByAuthIdWithWorkspace(firebaseUserId, workspaceName) {
        const Workspace = sequelize.models.Workspace;
        return await User.findOne({
            where: {
                firebaseUserId: firebaseUserId
            },
            include: {
                model: Workspace,
                as: 'workspaces',
                where: {
                    name: workspaceName
                }
            }
        })
    }

    static safeCreate(firebaseUserId, email, apiKey, stripeCustomerId, plan, explorerSubscriptionId, transaction) {
        if (!firebaseUserId || !apiKey || !stripeCustomerId || !plan) throw '[User.createUser] Missing parameter';
        
        return User.create({
            firebaseUserId: firebaseUserId,
            email: email,
            apiKey: apiKey,
            stripeCustomerId: stripeCustomerId,
            plan: plan,
            explorerSubscriptionId: explorerSubscriptionId,
        }, { transaction: transaction });
    }

    safeCreateWorkspace(data, transaction) {
        return this.createWorkspace({
            name: data.name,
            public: data.public,
            chain: data.chain,
            networkId: data.networkId,
            rpcServer: data.rpcServer,
            defaultAccount: data.settings && data.settings.defaultAccount,
            gasLimit: data.settings && data.settings.gasLimit,
            gasPrice: data.settings && data.settings.gasPrice,
            apiEnabled: data.integrations && data.integrations.indexOf('api') > -1,
            alchemyIntegrationEnabled: data.integrations && data.integrations.indexOf('alchemy') > -1
        }, { transaction: transaction });
    }
  }
  User.init({
    firebaseUserId: DataTypes.STRING,
    email: DataTypes.STRING,
    apiKey: DataTypes.STRING,
    currentWorkspaceId: DataTypes.INTEGER,
    plan: DataTypes.STRING,
    stripeCustomerId: DataTypes.STRING,
    explorerSubscriptionId: DataTypes.STRING,
    isPremium: {
        type: DataTypes.VIRTUAL,
        get() {
            return this.getDataValue('plan') == 'premium';
        }
    },
    canCreateWorkspace: {
        type: DataTypes.VIRTUAL,
        get() {
            return this.isPremium || this.workspaces.length === 0;
        }
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'users'
  });
  return User;
};