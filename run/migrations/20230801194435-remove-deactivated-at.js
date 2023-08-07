'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.removeColumn('explorers', 'deactivatedAt');
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.addColumn('explorers', 'deactivatedAt', {
      type: Sequelize.DataTypes.DATE,
      allowNull: true
    });
  }
};
