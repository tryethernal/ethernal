'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('contracts', 'ast', {
      type: Sequelize.DataTypes.JSON,
      allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('contracts', 'ast');
  }
};
