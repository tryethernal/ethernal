'use strict';
const {
  Model
} = require('sequelize');
const Analytics = require('../lib/analytics');
const analytics = new Analytics();

module.exports = (sequelize, DataTypes) => {
  class StripeSubscription extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
        StripeSubscription.belongsTo(models.Explorer, { foreignKey: 'explorerId', as: 'explorer' });
        StripeSubscription.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
        StripeSubscription.belongsTo(models.StripePlan, { foreignKey: 'stripePlanId', as: 'stripePlan' });
        StripeSubscription.hasOne(models.StripeQuotaExtension, { foreignKey: 'stripeSubscriptionId', as: 'stripeQuotaExtension' });
    }
  }
  StripeSubscription.init({
    explorerId: DataTypes.INTEGER,
    userId: DataTypes.INTEGER,
    stripePlanId: DataTypes.INTEGER,
    stripeId: DataTypes.STRING,
    status: DataTypes.ENUM('active', 'pending_cancelation', 'trial', 'trial_with_card'),
    transactionQuota: DataTypes.INTEGER,
    isActive: {
        type: DataTypes.VIRTUAL,
        get() {
            return this.getDataValue('status') == 'active';
        }
    },
    isPendingCancelation: {
      type: DataTypes.VIRTUAL,
      get() {
          return this.getDataValue('status') == 'pending_cancelation';
      }
    },
    isTrialing: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.getDataValue('status') == 'trial';
      }
    },
    isTrialingWithCard: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.getDataValue('status') == 'trial_with_card';
      }
    },
    cycleEndsAt: DataTypes.DATE,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  }, {
    hooks: {
      afterUpdate(stripeSubscription, options) {
        const afterUpdate = async () => {
          const explorer = await stripeSubscription.getExplorer();
          if (!explorer) return;
          const stripePlan = await stripeSubscription.getStripePlan();
          analytics.track(explorer.userId, 'explorer:subscription_update', {
            is_demo: explorer.isDemo,
            plan_slug: stripePlan.slug,
            status: stripeSubscription.status
          });
          return analytics.shutdown();
        };
        return options.transaction ? options.transaction.afterCommit(afterUpdate) : afterUpdate();
      },
      afterCreate(stripeSubscription, options) {
        const afterCreateFn = async () => {
          const explorer = await stripeSubscription.getExplorer({ include: 'workspace' });
          if (!explorer || explorer.workspace.qnEndpointId) return;
          const stripePlan = await stripeSubscription.getStripePlan();
          analytics.track(explorer.userId, 'explorer:subscription_create', {
            is_demo: explorer.isDemo,
            plan_slug: stripePlan.slug,
            status: stripeSubscription.status
          });
          analytics.shutdown();
          return explorer.startSync();
        };
        return options.transaction ? options.transaction.afterCommit(afterCreateFn) : afterCreateFn();
      },
      afterDestroy(stripeSubscription, options) {
        const afterDestroyFn = async () => {
          const explorer = await stripeSubscription.getExplorer();
          if (!explorer) return;
          const stripePlan = await stripeSubscription.getStripePlan();
          analytics.track(explorer.userId, 'explorer:subscription_delete', {
            is_demo: explorer.isDemo,
            plan_slug: stripePlan.slug,
          });
          analytics.shutdown();
          return explorer.stopSync();
        };
        return options.transaction ? options.transaction.afterCommit(afterDestroyFn) : afterDestroyFn();
      }
    },
    sequelize,
    modelName: 'StripeSubscription',
    tableName: 'stripe_subscriptions'
  });
  return StripeSubscription;
};



