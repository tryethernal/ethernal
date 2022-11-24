'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('contracts', 'bytecode', {
      type: Sequelize.DataTypes.TEXT,
      allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('contracts', 'bytecode');
  }
};
