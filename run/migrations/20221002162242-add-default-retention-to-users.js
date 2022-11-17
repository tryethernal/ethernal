'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'defaultDataRetentionLimit', {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 7
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'defaultDataRetentionLimit');
  }
};
