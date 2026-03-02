'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('op_chain_configs', 'l2BlockTime', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 2,
      comment: 'L2 block time in seconds (default: 2 for OP Stack)'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('op_chain_configs', 'l2BlockTime');
  }
};
