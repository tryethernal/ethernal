'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {

    await queryInterface.addColumn(
        'orbit_chain_configs',
        'topParentChainBlockValidationType',
        {
          type: Sequelize.ENUM('LATEST', 'SAFE'),
          allowNull: false,
          defaultValue: 'LATEST',
        }
      );
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('orbit_chain_configs', 'topParentChainBlockValidationType');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_orbit_chain_configs_topParentChainBlockValidationType";');
  }
};
