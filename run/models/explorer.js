'use strict';
const {
  Model
} = require('sequelize');
const ethers = require('ethers');
const { sanitize, slugify } = require('../lib/utils');
const { isStripeEnabled } = require('../lib/flags');
const { getDemoUserId, getAppDomain } = require('../lib/env');
const { enqueue } = require('../lib/queue');
const Analytics = require('../lib/analytics');
const analytics = new Analytics();
const IUniswapV2Router02 = require('../lib/abis/IUniswapV2Router02.json');
const IUniswapV2Factory = require('../lib/abis/IUniswapV2Factory.json');
const MAX_RPC_ATTEMPTS = 3;

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
      Explorer.hasOne(models.StripeSubscription, { foreignKey: 'explorerId', as: 'stripeSubscription' });
      Explorer.hasOne(models.ExplorerFaucet, { foreignKey: 'explorerId', as: 'faucet' });
      Explorer.hasOne(models.ExplorerV2Dex, { foreignKey: 'explorerId', as: 'v2Dex' });
      Explorer.hasMany(models.ExplorerDomain, { foreignKey: 'explorerId', as: 'domains' });
    }

    static safeCreateExplorer(explorer) {
        return Explorer.create(sanitize({
            userId: explorer.userId,
            workspaceId: explorer.workspaceId,
            chainId: explorer.chainId,
            name: explorer.name,
            rpcServer: explorer.rpcServer,
            slug: explorer.slug,
            themes: explorer.themes,
            totalSupply: explorer.totalSupply,
            domain: explorer.domain,
            token: explorer.token
        }));
    }

    static findBySlug(slug) {
        return Explorer.findOne({
            attributes: ['id', 'chainId', 'domain', 'l1Explorer', 'name', 'rpcServer', 'slug', 'token', 'themes', 'userId', 'workspaceId', 'gasAnalyticsEnabled', 'isDemo', 'totalSupply', 'displayTopAccounts'],
            where: { slug },
            include: [
                {
                    model: sequelize.models.ExplorerDomain,
                    as: 'domains',
                    attrbutes: ['domain']
                },
                {
                    model: sequelize.models.StripeSubscription,
                    attributes: ['id', 'stripePlanId'],
                    as: 'stripeSubscription',
                    include: {
                        model: sequelize.models.StripePlan,
                        attributes: ['capabilities'],
                        as: 'stripePlan',
                    }
                },
                {
                    model: sequelize.models.User,
                    attributes: ['firebaseUserId'],
                    as: 'admin'
                },
                {
                    model: sequelize.models.Workspace,
                    attributes: [
                        'id', 'name', 'storageEnabled', 'defaultAccount', 'gasPrice', 'gasLimit', 'erc721LoadingEnabled', 'statusPageEnabled', 'public',
                        [sequelize.literal('CASE WHEN tracing IS NOT NULL THEN true ELSE false END'), 'tracing']
                    ],
                    as: 'workspace',
                    include: [
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
                {
                    model: sequelize.models.ExplorerFaucet,
                    as: 'faucet',
                    attributes: ['id', 'address', 'amount', 'interval', 'active'],
                    where: { active: true },
                    required: false
                },
                {
                    model: sequelize.models.ExplorerV2Dex,
                    as: 'v2Dex',
                    attributes: ['id', 'routerAddress', 'active'],
                    required: false
                }
            ]
        });
    }

    static async findByDomain(domain) {
        const explorerDomain = await sequelize.models.ExplorerDomain.findOne({
            where: { domain },
            attributes: ['domain'],
            include: [
                {
                    model: Explorer,
                    as: 'explorer',
                    attributes: ['id', 'chainId', 'domain', 'l1Explorer', 'name', 'rpcServer', 'slug', 'token', 'themes', 'userId', 'workspaceId', 'gasAnalyticsEnabled', 'isDemo', 'totalSupply', 'displayTopAccounts'],
                    include: [
                        {
                            model: sequelize.models.StripeSubscription,
                            attributes: ['id', 'stripePlanId'],
                            as: 'stripeSubscription',
                            include: {
                                model: sequelize.models.StripePlan,
                                attributes: ['capabilities'],
                                as: 'stripePlan',
                            }
                        },
                        {
                            model: sequelize.models.User,
                            attributes: ['firebaseUserId'],
                            as: 'admin'
                        },
                        {
                            model: sequelize.models.Workspace,
                            attributes: [
                                'id', 'name', 'storageEnabled', 'defaultAccount', 'gasPrice', 'gasLimit', 'erc721LoadingEnabled', 'statusPageEnabled', 'public',
                                [sequelize.literal('CASE WHEN tracing IS NOT NULL THEN true ELSE false END'), 'tracing']
                            ],
                            as: 'workspace',
                            include: [
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
                        {
                            model: sequelize.models.ExplorerFaucet,
                            as: 'faucet',
                            attributes: ['id', 'address', 'amount', 'interval', 'active'],
                            where: { active: true },
                            required: false
                        },
                        {
                            model: sequelize.models.ExplorerV2Dex,
                            as: 'v2Dex',
                            attributes: ['id', 'routerAddress', 'active'],
                            required: false
                        }
                    ]
                }
            ]
        });
        if (!explorerDomain)
            return null;

        const explorer = explorerDomain.explorer;

        if (explorer)
            return explorer.stripeSubscription && explorer.stripeSubscription.stripePlan.capabilities.customDomain ? explorer : null;
        else
            return Explorer.findOne({
                attributes: ['id', 'chainId', 'domain', 'l1Explorer', 'name', 'rpcServer', 'slug', 'token', 'themes', 'totalSupply', 'displayTopAccounts'],
                where: { domain: domain },
                include: [
                    {
                        model: sequelize.models.StripeSubscription,
                        attributes: ['id', 'stripePlanId'],
                        as: 'stripeSubscription',
                        include: {
                            model: sequelize.models.StripePlan,
                            attributes: ['capabilities'],
                            as: 'stripePlan',
                        }
                    },
                    {
                        model: sequelize.models.User,
                        attributes: ['firebaseUserId'],
                        as: 'admin'
                    },
                    {
                        model: sequelize.models.Workspace,
                        attributes: [
                            'id', 'name', 'storageEnabled', 'defaultAccount', 'gasPrice', 'gasLimit', 'erc721LoadingEnabled', 'statusPageEnabled', 'public',
                            [sequelize.literal('CASE WHEN tracing IS NOT NULL THEN true ELSE false END'), 'tracing']
                        ],
                        as: 'workspace'
                    },
                    {
                        model: sequelize.models.ExplorerFaucet,
                        as: 'faucet',
                        attributes: ['id', 'address', 'amount', 'interval', 'active'],
                        where: { active: true },
                        required: false
                    },
                    {
                        model: sequelize.models.ExplorerV2Dex,
                        as: 'v2Dex',
                        attributes: ['id', 'routerAddress', 'active'],
                        required: false
                    }
                ]
            });
    }

    startSync() {
        return this.update({ shouldSync: true });
    }

    stopSync() {
        return this.update({ shouldSync: false });
    }

    async safeCreateV2Dex(routerAddress, factoryAddress, wrappedNativeTokenAddress) {
        if (!routerAddress || !factoryAddress || !wrappedNativeTokenAddress)
            throw new Error('Missing parameter');

        const dex = await this.getV2Dex();
        if (dex)
            throw new Error('This explorer already has a dex.');

        let [routerContract] = await sequelize.models.Contract.findOrCreate({
            where: {
                workspaceId: this.workspaceId,
                address: routerAddress.toLowerCase()
            }
        });
        const routerContractProperties = sanitize({
            abi: routerContract.abi ? routerContract.abi : IUniswapV2Router02,
            name: routerContract.name ? routerContract.name : 'UniswapV2Router'
        });
        await routerContract.update(routerContractProperties);

        let [factoryContract] = await sequelize.models.Contract.findOrCreate({
            where: {
                workspaceId: this.workspaceId,
                address: factoryAddress.toLowerCase()
            }
        });
        const factoryContractProperties = sanitize({
            abi: factoryContract.abi ? factoryContract.abi : IUniswapV2Factory,
            name: factoryContract.name ? factoryContract.name : 'UniswapV2Factory'
        });
        await factoryContract.update(factoryContractProperties);

        const [wrappedNativeTokenContract] = await sequelize.models.Contract.findOrCreate({
            where: {
                workspaceId: this.workspaceId,
                address: wrappedNativeTokenAddress.toLowerCase()
            }
        });

        return this.createV2Dex({
            routerAddress, factoryAddress,
            explorerId: this.id,
            wrappedNativeTokenContractId: wrappedNativeTokenContract.id
        });
    }

    async safeCreateFaucet(amount, interval, transaction) {
        if (!amount || !interval)
            throw new Error('Missing parameter');

        const faucet = await this.getFaucet();
        if (faucet)
            throw new Error('This explorer already has a faucet.');

        const { address, privateKey } = ethers.Wallet.createRandom();
        return this.createFaucet({ address, privateKey, amount, interval, active: true }, { transaction });
    }

    async isActive() {
        const subscription = await this.getStripeSubscription();
        const hasReachedTransactionQuota = await this.hasReachedTransactionQuota();

        return subscription && subscription.status == 'active' && !hasReachedTransactionQuota;
    }

    async getTransactionQuota() {
        if (!this.shouldEnforceQuota)
            return 0;

        const stripeSubscription = await this.getStripeSubscription({ include: ['stripePlan', 'stripeQuotaExtension']});
        if (!stripeSubscription)
            return 0;

        const extraQuota = stripeSubscription.stripeQuotaExtension && stripeSubscription.stripeQuotaExtension.quota;

        return stripeSubscription.stripePlan.capabilities.txLimit + extraQuota;
    }

    async hasReachedTransactionQuota() {
        if (!this.shouldEnforceQuota)
            return false;

        const stripeSubscription = await this.getStripeSubscription({ include: ['stripePlan', 'stripeQuotaExtension']});
        if (!stripeSubscription)
            return false;

        const baseQuota = stripeSubscription.stripePlan.capabilities.txLimit;
        const extraQuota = stripeSubscription.stripeQuotaExtension && stripeSubscription.stripeQuotaExtension.quota;
        return baseQuota > 0 && stripeSubscription.transactionQuota > baseQuota + extraQuota;
    }

    async hasTooManyFailedAttempts() {
        const workspace = await this.getWorkspace({ include: 'rpcHealthCheck' });
        if (workspace.rpcHealthCheck && workspace.rpcHealthCheck.failedAttempts <= MAX_RPC_ATTEMPTS)
            return true;
        return false;
    }

    async safeCreateDomain(domain, transaction) {
        if (!domain) throw new Error('Missing parameter');

        const existingDomain = await sequelize.models.ExplorerDomain.findOne({
            where: { domain }
        });

        if (existingDomain)
            throw new Error('This domain is already used.');

        return this.createDomain({ domain }, { transaction });
    }

    safeCreateSubscription(stripePlanId, stripeId, cycleEndsAt, status) {
        if (!stripePlanId || !cycleEndsAt || !status) throw new Error('Missing parameter');

        if (['active', 'trial', 'trial_with_card'].indexOf(status) == -1)
            throw new Error('Invalid subscription status');

        return this.createStripeSubscription({ stripePlanId, stripeId, cycleEndsAt, status });
    }

    async migrateDemoTo(userId, stripeSubscriptionData) {
        if  (!userId || !stripeSubscriptionData) throw new Error('Missing parameter');

        const workspace = await this.getWorkspace();
        if (!workspace)
            throw new Error('Cannot find workspace.');

        if (workspace.userId != getDemoUserId() || this.userId != getDemoUserId())
            throw new Error('Not allowed');

        const stripePlan = await sequelize.models.StripePlan.findOne({ where: { stripePriceId: stripeSubscriptionData.plan.id}});
        if (!stripePlan)
            throw new Error('Invalid plan');

        return sequelize.transaction(async transaction => {
            const newUser = await sequelize.models.User.findByPk(userId);
            const dataRetentionLimit = stripePlan.capabilities.txLimit || 0;

            await newUser.update({ currentWorkspaceId: workspace.id }, { transaction });
            await workspace.update({ userId, dataRetentionLimit }, { transaction });
            await this.update({ userId, themes: { light: {} }, isDemo: false }, { transaction });

            return this;
        });
    }

    async canUseCapability(capability) {
        if (['customDomain', 'branding', 'nativeToken', 'totalSupply', 'statusPage', 'l1Explorer'].indexOf(capability) < 0)
            return false;
        
        if (!isStripeEnabled())
            return true;

        const subscription = await this.getStripeSubscription({
            include: 'stripePlan'
        });

        return subscription && subscription.stripePlan.capabilities[capability];
    }

    async safeDelete(opts = { deleteSubscription: false }) {
        const stripeSubscription = await this.getStripeSubscription();
        if (
            !stripeSubscription ||
            stripeSubscription && stripeSubscription.isPendingCancelation ||
            stripeSubscription && opts.deleteSubscription ||
            !isStripeEnabled()
        ) {
            const transaction = await sequelize.transaction();
            try {
                if (stripeSubscription && opts.deleteSubscription)
                    await stripeSubscription.destroy({ transaction });

                const domains = await this.getDomains();
                for (let i = 0; i < domains.length; i++)
                    await domains[i].destroy({ transaction });
                if (stripeSubscription)
                    await stripeSubscription.destroy({ transaction });

                const workspace = await this.getWorkspace();
                await workspace.update({ public: false, rpcHealthCheckEnabled: false, integrityCheckStartBlockNumber: null }, { transaction });

                const faucet = await this.getFaucet();
                if (faucet)
                    await faucet.safeDestroy(transaction);

                const dex = await this.getV2Dex();
                if (dex)
                    await dex.safeDestroy(transaction);

                await this.destroy({ transaction });

                await transaction.commit();
            } catch(error) {
                await transaction.rollback();
                throw error;
            }
        } else if (stripeSubscription.isActive)
            throw new Error(`Can't delete explorer with an active subscription. Cancel it and wait until the end of the billing period.`);
        else
            throw new Error('Error deleting the explorer. Please retry');
    }

    async resetTransactionQuota() {
        const stripeSubscription = await this.getStripeSubscription();
        return stripeSubscription.update({ transactionQuota: 0 });
    }

    async safeUpdateSubscription(stripePlanId, stripeId, cycleEndsAt, status) {
        if (!stripePlanId || !cycleEndsAt || !status) throw new Error('Missing parameter');

        if (sequelize.models.StripeSubscription.rawAttributes.status.values.indexOf(status) == -1)
            throw new Error('Invalid subscription status');

        const stripeSubscription = await this.getStripeSubscription();

        return stripeSubscription.update(sanitize({ stripePlanId, stripeId, cycleEndsAt, status }));
    }

    async safeCancelSubscription() {
        const stripeSubscription = await this.getStripeSubscription();
        if (stripeSubscription)
            return stripeSubscription.update({ status: 'pending_cancelation' });
    }

    async safeRevertSubscriptionCancelation() {
        const stripeSubscription = await this.getStripeSubscription();
        if (stripeSubscription)
            return stripeSubscription.update({ status: 'active' });
    }

    async safeDeleteSubscription() {
        const stripeSubscription = await this.getStripeSubscription();
        if (stripeSubscription)
            return stripeSubscription.destroy();
    }

    async safeUpdateSettings(settings) {
        const ALLOWED_SETTINGS = ['name', 'slug', 'token', 'totalSupply', 'l1Explorer', 'rpcServer'];

        const filteredSettings = {};
        Object.keys(settings).forEach(key => {
            if (ALLOWED_SETTINGS.indexOf(key) > -1)
                filteredSettings[key] = settings[key];
        });

        if (Object.keys(filteredSettings).length > 0) {
            if (filteredSettings['token']) {
                const isNativeTokenAllowed = await this.canUseCapability('nativeToken');
                if (!isNativeTokenAllowed)
                    throw new Error('Upgrade your plan to customize your native token symbol.');
            }

            if (filteredSettings['totalSupply']) {
                const isTotalSupplyAllowed = await this.canUseCapability('totalSupply');
                if (!isTotalSupplyAllowed)
                    throw new Error('Upgrade your plan to display a total supply.');
            }

            if (filteredSettings['slug'] && filteredSettings['slug'] != this.slug) {
                const existingExplorer = await sequelize.models.Explorer.findOne({ where: { slug: filteredSettings['slug'] }});
                if (existingExplorer)
                    throw new Error('This domain is not available');
                filteredSettings['slug'] = slugify(filteredSettings['slug']);
            }

            if (filteredSettings['l1Explorer']) {
                const isL1ExplorerAllowed = await this.canUseCapability('l1Explorer');
                if (!isL1ExplorerAllowed)
                    throw new Error('Upgrade your plan to display L1 explorer links.')
            }

            return this.update(filteredSettings);
        }
    }

    async safeUpdateBranding(branding, transaction) {
        const ALLOWED_OPTIONS = ['light', 'logo', 'favicon', 'font', 'links', 'banner'];
        const ALLOWED_COLORS = ['primary', 'secondary', 'accent', 'error', 'info', 'success', 'warning', 'background'];

        const filteredOptions = {};
        Object.keys(branding).forEach(key => {
            if (ALLOWED_OPTIONS.indexOf(key) > -1)
                filteredOptions[key] = branding[key];
        });

        if (filteredOptions['light']) {
            const filteredColors = {};
            Object.keys(filteredOptions['light']).forEach(key => {
                if (ALLOWED_COLORS.indexOf(key) > -1)
                    filteredColors[key] = filteredOptions['light'][key];
            });
            filteredOptions['light'] = filteredColors;
        }

        if (filteredOptions['links'] && filteredOptions['links'].length) {
            const links = [];
            for (let i = 0; i < filteredOptions['links'].length; i++) {
                const link = filteredOptions['links'][i];
                if (link.uid)
                    links.push(link);
                else
                    links.push({ ...link, uid: Math.floor(Math.random() * 10000 )});
            }
            filteredOptions['links'] = links;
        }

        return this.update({ themes: { ...this.themes, ...filteredOptions }}, { transaction });
    }
  }
  Explorer.init({
    userId: DataTypes.INTEGER,
    workspaceId: DataTypes.INTEGER,
    chainId: DataTypes.INTEGER,
    domain: {
        type: DataTypes.STRING,
        get() {
            return `${this.getDataValue('slug')}.${getAppDomain()}`;
        }
    },
    name: DataTypes.STRING,
    rpcServer: DataTypes.STRING,
    slug: DataTypes.STRING,
    themes: DataTypes.JSON,
    token: DataTypes.STRING,
    totalSupply: DataTypes.STRING,
    shouldSync: DataTypes.BOOLEAN,
    shouldEnforceQuota: DataTypes.BOOLEAN,
    isDemo: DataTypes.BOOLEAN,
    l1Explorer: DataTypes.STRING,
    gasAnalyticsEnabled: DataTypes.BOOLEAN,
    displayTopAccounts: DataTypes.BOOLEAN
  }, {
    hooks: {
        afterCreate(explorer, options) {
            const afterCreateFn = () => {
                if (!explorer.isDemo) {
                    analytics.track(explorer.userId, 'explorer:explorer_create', {
                        is_demo: false
                    });
                    analytics.shutdown();
                }
            };
            return options.transaction ? options.transaction.afterCommit(afterCreateFn) : afterCreateFn();
        },
        afterUpdate(explorer, options) {
            const afterUpdateFn = () => {
                return enqueue('updateExplorerSyncingProcess', `updateExplorerSyncingProcess-${explorer.slug}`, {
                    explorerSlug: explorer.slug
                });
            };
            return options.transaction ? options.transaction.afterCommit(afterUpdateFn) : afterUpdateFn();
        },
        afterDestroy(explorer, options) {
            const afterDestroyFn = () => {
                return enqueue('updateExplorerSyncingProcess', `updateExplorerSyncingProcess-${explorer.slug}`, {
                    explorerSlug: explorer.slug
                  });
            };
            return options.transaction ? options.transaction.afterCommit(afterDestroyFn) : afterDestroyFn();
        }
    },
    sequelize,
    modelName: 'Explorer',
    tableName: 'explorers'
  });
  return Explorer;
};