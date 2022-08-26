'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('contracts', 'tokenTotalSupply', {
      type: Sequelize.DataTypes.STRING,
      allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('contracts', 'tokenTotalSupply');
  }
};