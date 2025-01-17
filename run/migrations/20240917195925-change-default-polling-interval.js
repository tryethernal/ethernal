'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.changeColumn('workspaces', 'pollingInterval', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 4000
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.changeColumn('workspaces', 'pollingInterval', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1000
    });
  }
};
