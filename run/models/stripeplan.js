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
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  }, {
    sequelize,
    modelName: 'StripePlan',
    tableName: 'stripe_plans'
  });
  return StripePlan;
};