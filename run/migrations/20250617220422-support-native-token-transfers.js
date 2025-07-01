'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        'DROP MATERIALIZED VIEW IF EXISTS token_transfer_volume_14d',
        { transaction }
      );

      await queryInterface.changeColumn('token_transfers', 'transactionLogId', {
        type: Sequelize.INTEGER,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('token_transfers', 'isReward', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }, { transaction });

      await queryInterface.addColumn('token_transfer_events', 'isReward', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }, { transaction });

      await queryInterface.removeColumn('token_transfers', 'processed', { transaction });
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn('token_transfers', 'processed', {
        type: Sequelize.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }, { transaction });

      await queryInterface.removeColumn('token_transfers', 'isReward', { transaction });
      await queryInterface.removeColumn('token_transfer_events', 'isReward', { transaction });
    });
  }
};
