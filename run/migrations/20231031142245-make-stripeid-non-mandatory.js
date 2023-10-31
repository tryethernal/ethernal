'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.changeColumn('stripe_plans', 'stripePriceId', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.changeColumn('stripe_plans', 'stripePriceId', {
      type: Sequelize.STRING,
      allowNull: false
    });
  }
};
