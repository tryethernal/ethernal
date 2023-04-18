'use strict';
const {
  Model, Sequelize
} = require('sequelize');
const { sanitize } = require('../lib/utils');
const { trigger } = require('../lib/pusher');
const { encode, decrypt } = require('../lib/crypto');
const { Workspace } = require('./index');

const Op = Sequelize.Op;

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      User.hasMany(models.Workspace, { foreignKey: 'userId', as: 'workspaces' });
      User.hasOne(models.Workspace, { foreignKey: 'id', sourceKey: 'currentWorkspaceId', as: 'currentWorkspace' });
      User.hasMany(models.Explorer, { foreignKey: 'userId', as: 'explorers' });
    }

    static findByAuthId(firebaseUserId, extraFields = []) {
        return User.findOne({
            where: {
                firebaseUserId: firebaseUserId
            },
            attributes: ['email', 'firebaseUserId', 'id', 'isPremium', 'plan', ...extraFields],
            include: ['workspaces', 'currentWorkspace']
        });
    }

    static findByStripeCustomerId(stripeCustomerId) {
        return User.findOne({
            where: {
                stripeCustomerId: stripeCustomerId
            },
            attributes: ['email', 'firebaseUserId', 'id', 'isPremium', 'plan'],
            include: ['workspaces', 'currentWorkspace']
        });
    }

    static findByAuthIdWithWorkspace(firebaseUserId, workspaceName) {
        const Workspace = sequelize.models.Workspace;
        return User.findOne({
            where: {
                firebaseUserId: firebaseUserId
            },
            attributes: ['email', 'firebaseUserId', 'id', 'isPremium', 'plan'],
            include: [
                {
                    model: Workspace,
                    as: 'workspaces',
                    where: {
                        name: workspaceName
                    },
                    include: [
                        {
                            model: sequelize.models.IntegrityCheck,
                            as: 'integrityCheck',
                            include: 'block'
                        },
                        {
                            model: sequelize.models.RpcHealthCheck,
                            as: 'rpcHealthCheck'
                        }
                    ]
                },
                'currentWorkspace'
            ]
        });
    }

    static async safeCreate(firebaseUserId, email, apiKey, stripeCustomerId, plan, explorerSubscriptionId, passwordHash, passwordSalt) {
        if (!firebaseUserId || !email || !apiKey || !stripeCustomerId || !plan) throw new Error('[User.createUser] Missing parameter');

        const existingUser = await User.findOne({
            where: {
                [Op.or]: [
                    { firebaseUserId: firebaseUserId },
                    { email: email }
                ]
            }
        })

        if (existingUser)
            throw new Error('This email address is already registered.');

        return User.create(sanitize({
            firebaseUserId: firebaseUserId,
            email: email,
            apiKey: apiKey,
            stripeCustomerId: stripeCustomerId,
            plan: plan,
            explorerSubscriptionId: explorerSubscriptionId,
            passwordHash: passwordHash,
            passwordSalt: passwordSalt
        }));
    }

    getApiToken() {
        return encode({
            apiKey: decrypt(this.apiKey),
            firebaseUserId: this.firebaseUserId
        });
    }

    async safeCreateWorkspace(data) {
        const existingWorkspace = await this.getWorkspaces({
            where: {
                name: data.name
            }
        });

        if (existingWorkspace.length > 0)
            throw new Error('A workspace with this name already exists');

        return this.createWorkspace(sanitize({
            name: data.name,
            public: data.public,
            chain: data.chain,
            networkId: data.networkId,
            rpcServer: data.rpcServer,
            defaultAccount: data.settings && data.settings.defaultAccount,
            gasLimit: data.settings && data.settings.gasLimit,
            gasPrice: data.settings && data.settings.gasPrice,
            tracing: data.tracing,
            dataRetentionLimit: data.dataRetentionLimit
        }));
    }
  }
  User.init({
    apiToken: {
        type: DataTypes.VIRTUAL,
        get() {
            return this.getDataValue('apiKey') ?
                encode({
                    firebaseUserId: this.getDataValue('firebaseUserId'),
                    apiKey: decrypt(this.getDataValue('apiKey'))
                }) :
                null;
        }
    },
    defaultDataRetentionLimit: DataTypes.INTEGER,
    apiKey: DataTypes.STRING,
    firebaseUserId: DataTypes.STRING,
    email: DataTypes.STRING,
    currentWorkspaceId: DataTypes.INTEGER,
    plan: DataTypes.STRING,
    stripeCustomerId: DataTypes.STRING,
    explorerSubscriptionId: DataTypes.STRING,
    passwordHash: DataTypes.STRING,
    passwordSalt: DataTypes.STRING,
    isPremium: {
        type: DataTypes.VIRTUAL,
        get() {
            return this.getDataValue('plan') == 'premium';
        }
    }
  }, {
    hooks: {
        afterUpdate(user, options) {
            trigger(`private-cache-users;id=${user.id}`, 'updated', user);
        }
    },
    sequelize,
    modelName: 'User',
    tableName: 'users'
  });
  return User;
};