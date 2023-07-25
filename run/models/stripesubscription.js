'use strict';
const {
  Model
} = require('sequelize');
const { enqueue } = require('../lib/queue');

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
    }
  }
  StripeSubscription.init({
    explorerId: DataTypes.INTEGER,
    userId: DataTypes.INTEGER,
    stripePlanId: DataTypes.INTEGER,
    stripeId: DataTypes.STRING,
    status: DataTypes.ENUM('active', 'pending_cancelation'),
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
    cycleEndsAt: DataTypes.DATE,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  }, {
    hooks: {
      afterSave(stripeSubscription, options) {
        const afterSaveFn = () => {
          return enqueue('processStripeSubscription', `processStripeSubscription-${stripeSubscription.id}`, {
            stripeSubscriptionId: stripeSubscription.id,
            explorerId: stripeSubscription.explorerId
          });
        }
        return options.transaction ? options.transaction.afterCommit(afterSaveFn) : afterSaveFn();
      },
      afterDestroy(stripeSubscription, options) {
        const afterDestroyFn = () => {
          return enqueue('processStripeSubscription', `processStripeSubscription-${stripeSubscription.id}`, {
            stripeSubscriptionId: stripeSubscription.id,
            explorerId: stripeSubscription.explorerId
          });
        }
        return options.transaction ? options.transaction.afterCommit(afterDestroyFn) : afterDestroyFn();
      }
    },
    sequelize,
    modelName: 'StripeSubscription',
    tableName: 'stripe_subscriptions'
  });
  return StripeSubscription;
};
