'use strict';
const {
  Model
} = require('sequelize');

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
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  }, {
    sequelize,
    modelName: 'StripeSubscription',
    tableName: 'stripe_subscriptions'
  });
  return StripeSubscription;
};