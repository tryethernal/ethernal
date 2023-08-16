'use strict';
const {
  Model
} = require('sequelize');
const { sanitize } = require('../lib/utils');
const { isStripeEnabled, isSubscriptionCheckEnabled } = require('../lib/flags');
const { enqueue } = require('../lib/queue');

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
            where: {
                slug: slug
            },
            include: [
                {
                    model: sequelize.models.StripeSubscription,
                    as: 'stripeSubscription',
                    include: {
                        model: sequelize.models.StripePlan,
                        as: 'stripePlan'
                    }
                },
                {
                    model: sequelize.models.User,
                    attributes: ['firebaseUserId'],
                    as: 'admin'
                },
                {
                    model: sequelize.models.Workspace,
                    attributes: ['name', 'storageEnabled', 'defaultAccount', 'gasPrice', 'gasLimit', 'erc721LoadingEnabled', 'statusPageEnabled', 'public'],
                    as: 'workspace'
                }
            ]
        });
    }

    static async findByDomain(domain) {
        let explorer;
        explorer = await Explorer.findOne({
            where: { domain: domain },
            include: [
                {
                    model: sequelize.models.StripeSubscription,
                    as: 'stripeSubscription',
                    include: {
                        model: sequelize.models.StripePlan,
                        as: 'stripePlan',
                        where: {
                            'capabilities.customDomain': true
                        },
                        required: isSubscriptionCheckEnabled()
                    }
                },
                {
                    model: sequelize.models.User,
                    attributes: ['firebaseUserId'],
                    as: 'admin'
                },
                {
                    model: sequelize.models.Workspace,
                    attributes: ['name', 'storageEnabled', 'defaultAccount', 'gasPrice', 'gasLimit', 'erc721LoadingEnabled', 'statusPageEnabled', 'public'],
                    as: 'workspace'
                }
            ]
        });

        if (!explorer)
            explorer = await Explorer.findOne({
                include: [
                    {
                        model: sequelize.models.ExplorerDomain,
                        as: 'domains',
                        where: { domain },
                        attributes: ['domain'],
                        required: true
                    },
                    {
                        model: sequelize.models.StripeSubscription,
                        as: 'stripeSubscription',
                        include: {
                            model: sequelize.models.StripePlan,
                            as: 'stripePlan',
                            where: {
                                'capabilities.customDomain': true
                            },
                            required: isSubscriptionCheckEnabled()
                        }
                    },
                    {
                        model: sequelize.models.User,
                        attributes: ['firebaseUserId'],
                        as: 'admin'
                    },
                    {
                        model: sequelize.models.Workspace,
                        attributes: ['name', 'storageEnabled', 'defaultAccount', 'gasPrice', 'gasLimit', 'erc721LoadingEnabled', 'statusPageEnabled', 'public'],
                        as: 'workspace'
                    }
                ]
            });

        return explorer;
    }

    async safeCreateDomain(domain) {
        if (!domain) throw new Error('Missing parameter');

        const canAddDomain = await this.canUseCapability('customDomain');
        if (!canAddDomain)
            throw new Error('Upgrade your plan to add custom domains.');

        const existingDomain = await sequelize.models.ExplorerDomain.findOne({
            where: { domain }
        });

        if (existingDomain)
            throw new Error('This domain is already in use.');

        return this.createDomain({ domain });
    }

    safeCreateSubscription(stripePlanId, stripeId, cycleEndsAt, status) {
        if (!stripePlanId || !cycleEndsAt || !status) throw new Error('Missing parameter');

        if (['active', 'trial', 'trial_with_card'].indexOf(status) == -1)
            throw new Error('Invalid subscription status');

        return this.createStripeSubscription({ stripePlanId, stripeId, cycleEndsAt, status });
    }

    async canUseCapability(capability) {
        if (['customDomain', 'branding', 'nativeToken', 'totalSupply', 'statusPage'].indexOf(capability) < 0)
            return false;
        
        if (!isStripeEnabled())
            return true;

        const subscription = await this.getStripeSubscription({
            include: 'stripePlan'
        });

        return subscription && subscription.stripePlan.capabilities[capability];
    }

    async safeDelete() {
        const stripeSubscription = await this.getStripeSubscription();
        if (!stripeSubscription || stripeSubscription && stripeSubscription.isPendingCancelation || !isStripeEnabled())
            return sequelize.transaction(async transaction => {
                const domains = await this.getDomains();
                for (let i = 0; i < domains.length; i++)
                    await domains[i].destroy({ transaction });
                if (stripeSubscription)
                    await stripeSubscription.destroy({ transaction });
                return this.destroy({ transaction });
            });
        else if (stripeSubscription.isActive)
            throw new Error(`Can't delete explorer with an active subscription. Cancel it and wait until the end of the billing period.`);
        else
            throw new Error('Error deleting the explorer. Please retry');
    }

    async safeUpdateSubscription(stripePlanId, cycleEndsAt, status) {
        if (!stripePlanId && !cycleEndsAt && !status) throw new Error('Missing parameter');

        if (sequelize.models.StripeSubscription.rawAttributes.status.values.indexOf(status) == -1)
            throw new Error('Invalid subscription status');

        const stripeSubscription = await this.getStripeSubscription();
        return stripeSubscription.update(sanitize({ stripePlanId, cycleEndsAt, status }));
    }

    async safeCancelSubscription() {
        const stripeSubscription = await this.getStripeSubscription();
        return stripeSubscription.update({ status: 'pending_cancelation' });
    }

    async safeRevertSubscriptionCancelation() {
        const stripeSubscription = await this.getStripeSubscription();
        return stripeSubscription.update({ status: 'active' });
    }

    async safeDeleteSubscription(stripeId) {
        const stripeSubscription = await this.getStripeSubscription();
        if (stripeSubscription.stripeId == stripeId)
            await stripeSubscription.destroy();
    }

    async safeUpdateSettings(settings) {
        const ALLOWED_SETTINGS = ['name', 'slug', 'token', 'totalSupply'];

        const filteredSettings = {};
        Object.keys(settings).forEach(key => {
            if (ALLOWED_SETTINGS.indexOf(key) > -1)
                filteredSettings[key] = settings[key];
        });

        if (Object.keys(filteredSettings).length > 0) {
            if (filteredSettings['token']) {
                const isNativeTokenAllowed = await this.canUseCapability('nativeToken');
                if (!isNativeTokenAllowed)
                    throw new Error('Upgrade your plan to customize your native token symbol.')
            }

            if (filteredSettings['totalSupply']) {
                const isTotalSupplyAllowed = await this.canUseCapability('totalSupply');
                if (!isTotalSupplyAllowed)
                    throw new Error('Upgrade your plan to display a total supply.')
            }

            return this.update(filteredSettings);
        }
    }

    async safeUpdateBranding(branding) {
        const canUpdateBranding = await this.canUseCapability('branding');
        if (!canUpdateBranding)
        throw new Error('Upgrade your plan to activate branding customization.');

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

        return this.update({ themes: { ...this.themes, ...filteredOptions }});
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
    hooks: {
        afterDestroy(explorer, options) {
            const afterDestroyFn = () => {
                return enqueue('processStripeSubscription', `processStripeSubscription-${explorer.slug}`, {
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