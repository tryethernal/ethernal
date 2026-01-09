'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('op_chain_configs', 'beaconUrl', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Beacon node URL for fetching blob data (e.g., https://beacon.example.com)'
    });

    await queryInterface.addColumn('op_chain_configs', 'l2GenesisTimestamp', {
      type: Sequelize.BIGINT,
      allowNull: true,
      comment: 'L2 genesis block timestamp (Unix seconds) for block range calculation'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('op_chain_configs', 'beaconUrl');
    await queryInterface.removeColumn('op_chain_configs', 'l2GenesisTimestamp');
  }
};
