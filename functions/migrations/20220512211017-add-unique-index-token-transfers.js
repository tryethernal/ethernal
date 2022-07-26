'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
        ALTER TABLE ONLY token_transfers
        ADD CONSTRAINT unique_dst_src_token_transactionId_token_transfers
        UNIQUE ("dst", "src", "token", "transactionId");
    `);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
        ALTER TABLE ONLY token_transfers
        DROP CONSTRAINT unique_dst_src_token_transactionId_token_transfers
    `);
  }
};
