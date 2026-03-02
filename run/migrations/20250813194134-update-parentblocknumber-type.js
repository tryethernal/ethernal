'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.changeColumn('orbit_batches', 'parentChainBlockNumber', {
      type: Sequelize.INTEGER,
      allowNull: false
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.changeColumn('orbit_batches', 'parentChainBlockNumber', {
      type: Sequelize.BIGINT,
      allowNull: false
    });
  }
};
