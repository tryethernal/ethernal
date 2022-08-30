'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('token_transfers', 'tokenIndex', {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('token_transfers', 'tokenIndex');
  }
};