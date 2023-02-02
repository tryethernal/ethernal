'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
        ALTER TABLE ONLY token_transfers
        DROP CONSTRAINT unique_dst_src_token_transactionId_tokenId_token_transfers
    `);
  },

  async down (queryInterface, Sequelize) {
  }
};
