'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('token_transfers', 'processed', {
        type: Sequelize.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('token_transfers', 'processed', { transaction });
  }
};
