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
