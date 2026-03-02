'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.renameColumn('workspaces', 'isTopOrbitParent', 'isTopL1Parent');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.renameColumn('workspaces', 'isTopL1Parent', 'isTopOrbitParent');
  }
};
