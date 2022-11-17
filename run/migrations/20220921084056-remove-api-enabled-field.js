'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.removeColumn('workspaces', 'apiEnabled');
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.addColumn('workspaces', 'apiEnabled', {
      type: Sequelize.DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
  }
};
