'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
        await queryInterface.sequelize.query(`
          ALTER TABLE token_transfers
          DROP CONSTRAINT "token_transfers_workspaceId_fkey",
          ADD CONSTRAINT "token_transfers_workspaceId_fkey"
          FOREIGN KEY ("workspaceId")
          REFERENCES workspaces(id)
          ON DELETE CASCADE;
        `, { transaction });

        await queryInterface.sequelize.query(`
          ALTER TABLE transaction_trace_steps
          DROP CONSTRAINT "transaction_trace_steps_workspaceId_fkey",
          ADD CONSTRAINT "transaction_trace_steps_workspaceId_fkey"
          FOREIGN KEY ("workspaceId")
          REFERENCES workspaces(id)
          ON DELETE CASCADE;
        `, { transaction });

        await queryInterface.sequelize.query(`
          ALTER TABLE token_balance_changes
          DROP CONSTRAINT "token_balance_changes_workspaceId_fkey",
          ADD CONSTRAINT "token_balance_changes_workspaceId_fkey"
          FOREIGN KEY ("workspaceId")
          REFERENCES workspaces(id)
          ON DELETE CASCADE;
        `, { transaction });

        await transaction.commit();
    } catch(error) {
        console.log(error);
        await transaction.rollback();
        throw error;
    }
  },
  async down(queryInterface, Sequelize) {
      const transaction = await queryInterface.sequelize.transaction();
      try {
        await queryInterface.sequelize.query(`
          ALTER TABLE token_transfers
          DROP CONSTRAINT "token_transfers_workspaceId_fkey",
          ADD CONSTRAINT "token_transfers_workspaceId_fkey"
          FOREIGN KEY ("workspaceId")
          REFERENCES workspaces(id);
        `, { transaction });

        await queryInterface.sequelize.query(`
          ALTER TABLE transaction_trace_steps
          DROP CONSTRAINT "transaction_trace_steps_workspaceId_fkey",
          ADD CONSTRAINT "transaction_trace_steps_workspaceId_fkey"
          FOREIGN KEY ("workspaceId")
          REFERENCES workspaces(id);
        `, { transaction });

        await queryInterface.sequelize.query(`
          ALTER TABLE token_balance_changes
          DROP CONSTRAINT "token_balance_changes_workspaceId_fkey",
          ADD CONSTRAINT "token_balance_changes_workspaceId_fkey"
          FOREIGN KEY ("workspaceId")
          REFERENCES workspaces(id);
        `, { transaction });

        await transaction.commit();
      } catch(error) {
          console.log(error);
          await transaction.rollback();
          throw error;
      }
  }
};
