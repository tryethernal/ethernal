/**
 * @fileoverview StripePlan model - defines subscription plans and capabilities.
 * Links Stripe price IDs to feature capabilities.
 *
 * @module models/StripePlan
 *
 * @property {number} id - Primary key
 * @property {string} slug - Plan identifier (e.g., 'pro', 'enterprise')
 * @property {string} name - Display name
 * @property {string} stripePriceId - Stripe price ID
 * @property {Object} capabilities - Feature flags and limits
 * @property {number} price - Price in cents
 */

'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class StripePlan extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      StripePlan.hasMany(models.StripeSubscription, { foreignKey: 'stripePlanId', as: 'stripeSubscriptions' });
    }
  }
  StripePlan.init({
    slug: DataTypes.STRING,
    name: DataTypes.STRING,
    stripePriceId: DataTypes.STRING,
    capabilities: DataTypes.JSON,
    price: DataTypes.INTEGER,
    public: DataTypes.BOOLEAN,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  }, {
    sequelize,
    modelName: 'StripePlan',
    tableName: 'stripe_plans'
  });
  return StripePlan;
};
