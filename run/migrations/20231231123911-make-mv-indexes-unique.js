'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.sequelize.query(`DROP INDEX "transaction_volume_14d_workspaceId"`, { transaction });
      await queryInterface.sequelize.query(`
          CREATE UNIQUE INDEX "transaction_volume_14d_workspaceId_timestamp"
          ON transaction_volume_14d("workspaceId", "timestamp");
      `, { transaction });

      await queryInterface.sequelize.query(`DROP INDEX "wallet_volume_14d_workspaceId"`, { transaction });
      await queryInterface.sequelize.query(`
          CREATE UNIQUE INDEX "wallet_volume_14d_workspaceId_timestamp"
          ON wallet_volume_14d("workspaceId", "timestamp");
      `, { transaction });

      await transaction.commit();
    } catch(error) {
      console.log(error);
      await transaction.rollback();
      throw error;
    }
  },

  async down (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.sequelize.query(`DROP INDEX "transaction_volume_14d_workspaceId_timestamp"`, { transaction });
      await queryInterface.sequelize.query(`
          CREATE INDEX "transaction_volume_14d_workspaceId"
          ON transaction_volume_14d("workspaceId");
      `, { transaction });

      await queryInterface.sequelize.query(`DROP INDEX "wallet_volume_14d_workspaceId_timestamp"`, { transaction });
      await queryInterface.sequelize.query(`
          CREATE INDEX "wallet_volume_14d_workspaceId"
          ON wallet_volume_14d("workspaceId");
      `, { transaction });

      await transaction.commit();
    } catch(error) {
      console.log(error);
      await transaction.rollback();
      throw error;
    }
  }
};
