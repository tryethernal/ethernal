'use strict';
const {
  Model, Sequelize
} = require('sequelize');
const { randomUUID } = require('crypto');
const uuidAPIKey = require('uuid-apikey');
const { isSelfHosted } = require('../lib/flags');
const { sanitize, slugify, validateBNString } = require('../lib/utils');
const { enqueue } = require('../lib/queue');
const { trigger } = require('../lib/pusher');
const { encode, decrypt, encrypt, firebaseHash } = require('../lib/crypto');

const Op = Sequelize.Op;
const SYNC_RATE_LIMIT_INTERVAL = 5000
const SYNC_RATE_LIMIT_MAX_IN_INTERVAL = 25;

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
        const currentExplorerAttributes = ['id', 'chainId', 'domain', 'isDemo', 'name', 'rpcServer', 'shouldSync', 'slug', 'themes', 'userId', 'workspaceId', 'gasAnalyticsEnabled', 'displayTopAccounts'];
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
            if (currentExplorer && (currentExplorer.isDemo || currentExplorer.stripeSubscription && currentExplorer.stripeSubscription.stripePlan.capabilities.l1Explorer))
                currentExplorerAttributes.push('l1Explorer');
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
                    include: 'explorer',
                    where: {
                        pendingDeletion: false
                    },
                    required: false
                },
                {
                    model: sequelize.models.Workspace,
                    as: 'currentWorkspace',
                    include: [
                        {
                            model: sequelize.models.Explorer,
                            as: 'explorer',
                            attributes: currentExplorerAttributes,
                            include: [
                                {
                                    model: sequelize.models.ExplorerDomain,
                                    as: 'domains',
                                    attributes: ['domain']
                                },
                                {
                                    model: sequelize.models.ExplorerFaucet,
                                    as: 'faucet',
                                    attributes: ['id', 'address', 'interval', 'amount', 'active']
                                },
                                {
                                    model: sequelize.models.ExplorerV2Dex,
                                    as: 'v2Dex',
                                    attributes: ['id', 'routerAddress', 'active']
                                }
                            ]
                        },
                        {
                            model: sequelize.models.CustomField,
                            as: 'packages',
                            attributes: ['function']
                        },
                        {
                            model: sequelize.models.CustomField,
                            as: 'functions',
                            attributes: ['function']
                        }
                    ]
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
                        name: workspaceName,
                        pendingDeletion: false
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

    static async createAdmin(email, password) {
        if (!isSelfHosted())
            throw new Error('This feature is only available on self-hosted instances');

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser)
            throw new Error('This email address is already registered.');

        const apiKey = uuidAPIKey.create().apiKey;
        const encryptedKey = encrypt(apiKey);

        let uid, passwordSalt, passwordHash;
        ({ uid, passwordSalt, passwordHash } = { uid: randomUUID(), ...(await firebaseHash(password)) });

        return User.create({
            firebaseUserId: uid,
            email,
            apiKey: encryptedKey,
            stripeCustomerId: 'dummy',
            plan: 'premium',
            passwordHash,
            passwordSalt,
            canUseDemoPlan: true,
            canTrial: false
        });
    }

    static async safeCreate(firebaseUserId, email, apiKey, stripeCustomerId, plan, explorerSubscriptionId, passwordHash, passwordSalt, qnId) {
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
            passwordSalt: passwordSalt,
            qnId
        }));
    }

    createExplorerFromOptions({ backendRpcServer, frontendRpcServer, name, networkId, chain = 'ethereum', tracing = 'other', faucet, token, slug, totalSupply, l1Explorer, branding, qnEndpointId, domains = [], isDemo = false, subscription, integrityCheckStartBlockNumber }) {
        if (!backendRpcServer || !name || !networkId)
            throw new Error('Missing parameters');

        return sequelize.transaction(async transaction => {
            const existingWorkspace = await sequelize.models.Workspace.findOne({ where: { name, userId: this.id }});
            if (existingWorkspace)
                throw new Error('You already have a workspace with this name');

            const workspace = await this.createWorkspace(sanitize({
                name: name,
                public: true,
                chain: chain,
                networkId: networkId,
                rpcServer: backendRpcServer,
                tracing: tracing,
                dataRetentionLimit: this.defaultDataRetentionLimit,
                integrityCheckStartBlockNumber: integrityCheckStartBlockNumber,
                browserSyncEnabled: false,
                storageEnabled: false,
                erc721LoadingEnabled: false,
                rpcHealthCheckEnabled: true,
                rateLimitInterval: SYNC_RATE_LIMIT_INTERVAL,
                rateLimitMaxInInterval: SYNC_RATE_LIMIT_MAX_IN_INTERVAL,
                qnEndpointId
            }), { transaction });

            if (!workspace)
                throw new Error('Could not create workspace');

            if (!this.currentWorkspaceId)
                await this.update({ currentWorkspaceId: workspace.id }, { transaction });

            const tentativeSlug = slug || slugify(workspace.name);
            const existingExplorer = await sequelize.models.Explorer.findOne({ where: { slug: tentativeSlug }});
            const explorerSlug = existingExplorer ?
                `${tentativeSlug}-${Math.floor(Math.random() * 100)}` :
                tentativeSlug;

            if (totalSupply && !validateBNString(totalSupply))
                throw new Error('Invalid total supply. It needs to be a string representing a positive wei amount.');

            const explorer = await workspace.createExplorer(sanitize({
                token, totalSupply, l1Explorer, isDemo,
                userId: this.id,
                chainId: workspace.networkId,
                slug: explorerSlug,
                name: workspace.name,
                rpcServer: frontendRpcServer || backendRpcServer,
                themes: { 'default': {}},
                domain: `${explorerSlug}.${process.env.APP_DOMAIN}`
            }), { transaction });

            let updatedBranding = branding;
            if (isDemo) {
                const jwtToken = encode({ explorerId: explorer.id });
                updatedBranding = {
                    banner: `This is a demo explorer that will expire after 24 hours and is limited to 5,000 txs. To remove the limit & set it up permanently,&nbsp;<a data-vue-action="openMigrationModal" data-jwt="${jwtToken}" href="#">click here</a>.`
                };
            }

            if (updatedBranding)
                await explorer.safeUpdateBranding(updatedBranding, transaction);

            if (faucet)
                await explorer.safeCreateFaucet(faucet.amount, faucet.interval, transaction);

            if (domains && domains.length) {
                if (domains.length > 10)
                    throw new Error(`Can't set more than 10 domains on creation. Use the domain creation endpoint to add more.`);
                for (let i = 0; i < domains.length; i++)
                    await explorer.safeCreateDomain(domains[i], transaction);
            }

            if (subscription)
                await explorer.safeCreateSubscription(subscription.stripePlanId, subscription.stripeId, subscription.cycleEndsAt, subscription.status);

            return explorer;
        });
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
                storageEnabled: false,
                erc721LoadingEnabled: false,
                rateLimitInterval: SYNC_RATE_LIMIT_INTERVAL,
                rateLimitMaxInInterval: SYNC_RATE_LIMIT_MAX_IN_INTERVAL,
                qnEndpointId: data.qnEndpointId
            }), { transaction });

            if (!workspace)
                throw new Error('Could not create explorer.');

            return workspace.safeCreateExplorer(transaction);
        });
    };

    async safeCreateWorkspace(data, transaction) {
        const fn = async transaction => {
            const existingWorkspace = await sequelize.models.Workspace.findOne({
                where: {
                    userId: this.id,
                    name: data.name,
                    pendingDeletion: false
                }
            });

            if (existingWorkspace)
                throw new Error('A workspace with this name already exists.');

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
                dataRetentionLimit: data.dataRetentionLimit,
                qnEndpointId: data.qnEndpointId
            }), { transaction });

            return sequelize.models.Workspace.findOne({
                where: { id: workspace.id },
                include: {
                    model: sequelize.models.Explorer,
                    as: 'explorer',
                    attributes: ['id']
                }
            });
        };

        return transaction ? fn(transaction) : sequelize.transaction(fn);
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
    qnId: DataTypes.STRING,
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