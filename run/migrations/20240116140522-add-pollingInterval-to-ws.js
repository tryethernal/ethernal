'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('workspaces', 'pollingInterval', {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1000
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('workspaces', 'pollingInterval');
  }
};
