'use strict';
const {
  Model, Sequelize
} = require('sequelize');
const { sanitize } = require('../lib/utils');
const { enqueue } = require('../lib/queue');
const { trigger } = require('../lib/pusher');
const { encode, decrypt } = require('../lib/crypto');

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
      User.hasOne(models.StripeSubscription, { foreignKey: 'userId', as: 'stripeSubscription' });
    }

    static async findByAuthId(firebaseUserId, extraFields = []) {
        const currentExplorerAttributes = ['id', 'chainId', 'domain', 'isDemo', 'name', 'rpcServer', 'shouldSync', 'slug', 'themes', 'userId', 'workspaceId'];
        const user = await User.findOne({ where: { firebaseUserId }, include: 'currentWorkspace' })
        if (user.currentWorkspace) {
            const currentExplorer = await user.currentWorkspace.getExplorer({
                include: {
                    model: sequelize.models.StripeSubscription,
                    as: 'stripeSubscription',
                    include: 'stripePlan'
                }
            });
            if (currentExplorer && (currentExplorer.isDemo || currentExplorer.stripeSubscription && currentExplorer.stripeSubscription.stripePlan.capabilities.nativeToken))
                currentExplorerAttributes.push('token');
            if (currentExplorer && (currentExplorer.isDemo || currentExplorer.stripeSubscription && currentExplorer.stripeSubscription.stripePlan.capabilities.totalSupply))
                currentExplorerAttributes.push('totalSupply');
        }
        return  User.findOne({
            where: {
                firebaseUserId: firebaseUserId
            },
            attributes: ['email', 'firebaseUserId', 'id', 'isPremium', 'plan', 'cryptoPaymentEnabled', ...extraFields],
            include: [
                {
                    model: sequelize.models.Workspace,
                    as: 'workspaces',
                    include: 'explorer'
                },
                {
                    model: sequelize.models.Workspace,
                    as: 'currentWorkspace',
                    include: {
                        model: sequelize.models.Explorer,
                        as: 'explorer',
                        attributes: currentExplorerAttributes
                    }
                },
            ]
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
                            model: sequelize.models.Explorer,
                            as: 'explorer',
                            include: {
                                model: sequelize.models.StripeSubscription,
                                as: 'stripeSubscription',
                                include: {
                                    model: sequelize.models.StripePlan,
                                    as: 'stripePlan'
                                }
                            }
                        },
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

    disableTrialMode() {
        return this.update({ canTrial: false });
    }

    async safeCreateWorkspaceWithExplorer(data) {
        const existingWorkspace = await sequelize.models.Workspace.findOne({
            where: {
                userId: this.id,
                name: data.name
            }
        });

        if (existingWorkspace)
            throw new Error('An explorer with this name already exists.');

        return sequelize.transaction(async transaction => {
            const workspace = await this.createWorkspace(sanitize({
                name: data.name,
                public: true,
                chain: 'ethereum',
                networkId: data.networkId,
                rpcServer: data.rpcServer,
                tracing: data.tracing,
                dataRetentionLimit: data.dataRetentionLimit || this.defaultDataRetentionLimit,
                browserSyncEnabled: false,
                erc721LoadingEnabled: false
            }), { transaction });

            if (!workspace)
                throw new Error('Could not create explorer.');

            return workspace.safeCreateExplorer(transaction);
        });
    };

    async safeCreateWorkspace(data) {
        const existingWorkspace = await this.getWorkspaces({
            where: {
                name: data.name
            }
        });

        if (existingWorkspace.length > 0)
            throw new Error('A workspace with this name already exists.');

        return sequelize.transaction(async transaction => {
            const workspace = await this.createWorkspace(sanitize({
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
            }), { transaction });

            return sequelize.models.Workspace.findOne({
                where: { id: workspace.id },
                include: {
                    model: sequelize.models.Explorer,
                    as: 'explorer',
                    attributes: ['id']
                }
            });
        });
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
    canUseDemoPlan: DataTypes.BOOLEAN,
    apiKey: DataTypes.STRING,
    firebaseUserId: DataTypes.STRING,
    email: DataTypes.STRING,
    currentWorkspaceId: DataTypes.INTEGER,
    plan: DataTypes.STRING,
    stripeCustomerId: DataTypes.STRING,
    cryptoPaymentEnabled: DataTypes.BOOLEAN,
    explorerSubscriptionId: DataTypes.STRING,
    passwordHash: DataTypes.STRING,
    passwordSalt: DataTypes.STRING,
    canTrial: DataTypes.BOOLEAN,
    isPremium: {
        type: DataTypes.VIRTUAL,
        get() {
            return this.getDataValue('plan') == 'premium';
        }
    }
  }, {
    hooks: {
        afterCreate(user, options) {
            return enqueue('processUser', `processUser-${user.id}`, { id: user.id });
        },
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