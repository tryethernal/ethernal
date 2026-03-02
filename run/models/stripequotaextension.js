/**
 * @fileoverview StripeQuotaExtension model - additional transaction quota purchases.
 * Extends base subscription limits with one-time quota additions.
 *
 * @module models/StripeQuotaExtension
 *
 * @property {number} id - Primary key
 * @property {number} stripeSubscriptionId - Foreign key to subscription
 * @property {number} stripePlanId - Foreign key to plan
 * @property {string} stripeId - Stripe product ID
 * @property {number} quota - Additional quota amount
 */

'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class StripeQuotaExtension extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
        StripeQuotaExtension.belongsTo(models.StripeSubscription, { foreignKey: 'stripeSubscriptionId', as: 'stripeSubscription' });
        StripeQuotaExtension.belongsTo(models.StripePlan, { foreignKey: 'stripePlanId', as: 'stripePlan' });
    }
  }
  StripeQuotaExtension.init({
    stripeSubscriptionId: DataTypes.INTEGER,
    stripePlanId: DataTypes.INTEGER,
    stripeId: DataTypes.STRING,
    quota: DataTypes.INTEGER,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  }, {
    sequelize,
    modelName: 'StripeQuotaExtension',
    tableName: 'stripe_quota_extensions'
  });
  return StripeQuotaExtension;
};
