'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.removeColumn('explorers', 'stripeSubscriptionId');
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.addColumn('explorers', 'stripeSubscriptionId', {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: true
    });
  }
};
