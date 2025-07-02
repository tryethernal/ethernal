'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    // Allow NULL values for the price field in stripe_plans
    await queryInterface.changeColumn('stripe_plans', 'price', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    // Revert price field to NOT NULL in stripe_plans
    await queryInterface.changeColumn('stripe_plans', 'price', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
  }
};
