'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
        await queryInterface.sequelize.query(`
          ALTER TABLE custom_fields
          DROP CONSTRAINT "custom_fields_workspaceId_fkey",
          ADD CONSTRAINT "custom_fields_workspaceId_fkey"
          FOREIGN KEY ("workspaceId")
          REFERENCES workspaces(id)
          ON DELETE CASCADE;
        `, { transaction });

        await queryInterface.sequelize.query(`
          ALTER TABLE transactions
          DROP CONSTRAINT "transactions_workspaceId_fkey",
          ADD CONSTRAINT "transactions_workspaceId_fkey"
          FOREIGN KEY ("workspaceId")
          REFERENCES workspaces(id)
          ON DELETE CASCADE;
        `, { transaction });

        await queryInterface.sequelize.query(`
          ALTER TABLE transaction_receipts
          DROP CONSTRAINT "transaction_receipts_workspaceId_fkey",
          ADD CONSTRAINT "transaction_receipts_workspaceId_fkey"
          FOREIGN KEY ("workspaceId")
          REFERENCES workspaces(id)
          ON DELETE CASCADE;
        `, { transaction });

        await queryInterface.sequelize.query(`
          ALTER TABLE transaction_logs
          DROP CONSTRAINT "transaction_logs_workspaceId_fkey",
          ADD CONSTRAINT "transaction_logs_workspaceId_fkey"
          FOREIGN KEY ("workspaceId")
          REFERENCES workspaces(id)
          ON DELETE CASCADE;
        `, { transaction });

        await queryInterface.sequelize.query(`
          ALTER TABLE contracts
          DROP CONSTRAINT "contracts_workspaceId_fkey",
          ADD CONSTRAINT "contracts_workspaceId_fkey"
          FOREIGN KEY ("workspaceId")
          REFERENCES workspaces(id)
          ON DELETE CASCADE;
        `, { transaction });

        await queryInterface.sequelize.query(`
          ALTER TABLE accounts
          DROP CONSTRAINT "accounts_workspaceId_fkey",
          ADD CONSTRAINT "accounts_workspaceId_fkey"
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
          ALTER TABLE custom_fields
          DROP CONSTRAINT "custom_fields_workspaceId_fkey",
          ADD CONSTRAINT "custom_fields_workspaceId_fkey"
          FOREIGN KEY ("workspaceId")
          REFERENCES workspaces(id);
        `, { transaction });

        await queryInterface.sequelize.query(`
          ALTER TABLE transactions
          DROP CONSTRAINT "transactions_workspaceId_fkey",
          ADD CONSTRAINT "transactions_workspaceId_fkey"
          FOREIGN KEY ("workspaceId")
          REFERENCES workspaces(id);
        `, { transaction });

        await queryInterface.sequelize.query(`
          ALTER TABLE transaction_receipts
          DROP CONSTRAINT "transaction_receipts_workspaceId_fkey",
          ADD CONSTRAINT "transaction_receipts_workspaceId_fkey"
          FOREIGN KEY ("workspaceId")
          REFERENCES workspaces(id);
        `, { transaction });

        await queryInterface.sequelize.query(`
          ALTER TABLE transaction_logs
          DROP CONSTRAINT "transaction_logs_workspaceId_fkey",
          ADD CONSTRAINT "transaction_logs_workspaceId_fkey"
          FOREIGN KEY ("workspaceId")
          REFERENCES workspaces(id);
        `, { transaction });

        await queryInterface.sequelize.query(`
          ALTER TABLE contracts
          DROP CONSTRAINT "contracts_workspaceId_fkey",
          ADD CONSTRAINT "contracts_workspaceId_fkey"
          FOREIGN KEY ("workspaceId")
          REFERENCES workspaces(id);
        `, { transaction });

        await queryInterface.sequelize.query(`
          ALTER TABLE accounts
          DROP CONSTRAINT "accounts_workspaceId_fkey",
          ADD CONSTRAINT "accounts_workspaceId_fkey"
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
