'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('workspaces', 'integrityCheckStartBlockNumber', {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('workspaces', 'integrityCheckStartBlockNumber');
  }
};
