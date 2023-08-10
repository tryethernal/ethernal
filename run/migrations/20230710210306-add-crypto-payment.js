'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'cryptoPaymentEnabled', {
      type: Sequelize.DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'cryptoPaymentEnabled');
  }
};
