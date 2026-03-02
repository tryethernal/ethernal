'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.changeColumn('orbit_nodes', 'nodeNum', {
      type: Sequelize.BIGINT,
      allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.changeColumn('orbit_nodes', 'nodeNum', {
      type: Sequelize.BIGINT,
      allowNull: false
    });
  }
};
