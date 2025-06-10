'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `CREATE INDEX IF NOT EXISTS idx_transaction_events_workspace_to 
         ON transaction_events ("workspaceId", "to");`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `CREATE INDEX IF NOT EXISTS idx_token_transfer_events_workspace_src 
         ON token_transfer_events ("workspaceId", "src");`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `CREATE INDEX IF NOT EXISTS idx_token_transfer_events_workspace_dst 
         ON token_transfer_events ("workspaceId", "dst");`,
        { transaction }
      );
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `DROP INDEX IF EXISTS idx_transaction_events_workspace_to;`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `DROP INDEX IF EXISTS idx_token_transfer_events_workspace_src;`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `DROP INDEX IF EXISTS idx_token_transfer_events_workspace_dst;`,
        { transaction }
      );
    });
  }
};
