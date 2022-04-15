'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    queryInterface.addColumn('workspaces', 'tracing', {
      type: Sequelize.DataTypes.STRING
    });
  },

  async down (queryInterface, Sequelize) {
    queryInterface.removeColumn('workspaces', 'tracing');
  }
};
