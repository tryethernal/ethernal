'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  // eslint-disable-next-line no-unused-vars
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn(
        'orbit_chain_configs',
        'topParentChainBlockValidationType',
        {
          type: Sequelize.ENUM('LATEST', 'SAFE', 'FINALIZED'),
          allowNull: false,
          defaultValue: 'LATEST',
          comment: 'Type of parent chain block validation: LATEST, SAFE, FINALIZED'
        },
        { transaction }
      );
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  // eslint-disable-next-line no-unused-vars
  async down (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn('orbit_chain_configs', 'topParentChainBlockValidationType', { transaction });
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_orbit_chain_configs_topParentChainBlockValidationType";',
        { transaction }
      );
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
