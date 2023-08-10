'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('stripe_subscriptions', 'transactionQuota', {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('stripe_subscriptions', 'transactionQuota');
  }
};
