'use strict';
const {
  Model
} = require('sequelize');
const { sanitize } = require('../lib/utils');
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
                    model: sequelize.models.User,
                    attributes: ['firebaseUserId'],
                    as: 'admin'
                },
                {
                    model: sequelize.models.Workspace,
                    attributes: ['name', 'storageEnabled', 'defaultAccount', 'gasPrice', 'gasLimit', 'erc721LoadingEnabled', 'statusPageEnabled'],
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
                    attributes: ['name', 'storageEnabled', 'defaultAccount', 'gasPrice', 'gasLimit', 'erc721LoadingEnabled', 'statusPageEnabled'],
                    as: 'workspace'
                }
            ]
        });
    }

    safeCreateSubscription(stripePlanId, stripeId, cycleEndsAt) {
        if (!stripePlanId || !stripeId) throw new Error('Missing parameter');

        return this.createStripeSubscription({
            stripePlanId: stripePlanId,
            stripeId: stripeId,
            cycleEndsAt: cycleEndsAt
        });
    }

    async safeUpdateSubscription(stripePlanId) {
        if (!stripePlanId) throw new Error('Missing parameter');

        const stripeSubscription = await this.getStripeSubscription();
        return stripeSubscription.update({ stripePlanId: stripePlanId });
    }

    async safeCancelSubscription() {
        const stripeSubscription = await this.getStripeSubscription();
        return stripeSubscription.update({ status: 'pending_cancelation' });
    }

    async safeDeleteSubscription(stripeId) {
        const stripeSubscription = await this.getStripeSubscription();
        if (stripeSubscription.stripeId == stripeId)
            await stripeSubscription.destroy();
    }

    safeUpdateSettings(settings) {
        const ALLOWED_SETTINGS = ['name', 'slug', 'token', 'totalSupply', 'statusPageEnabled'];

        const filteredSettings = {};
        Object.keys(settings).forEach(key => {
            if (ALLOWED_SETTINGS.indexOf(key) > -1)
                filteredSettings[key] = settings[key];
        });

        if (Object.keys(filteredSettings).length > 0)
            return this.update(filteredSettings);
    }

    safeUpdateBranding(branding) {
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
    totalSupply: DataTypes.STRING,
    deactivatedAt: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'Explorer',
    tableName: 'explorers'
  });
  return Explorer;
};