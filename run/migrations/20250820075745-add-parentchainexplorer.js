'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('orbit_chain_configs', 'parentChainExplorer', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'https://etherscan.io'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('orbit_chain_configs', 'parentChainExplorer');
  }
};
