'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
        await queryInterface.sequelize.query(`
            ALTER TABLE ONLY token_transfers
            DROP CONSTRAINT unique_dst_src_token_transactionId_token_transfers
        `, { transaction });

        await queryInterface.sequelize.query(`
            ALTER TABLE ONLY token_transfers
            ADD CONSTRAINT unique_dst_src_token_transactionId_tokenId_token_transfers
            UNIQUE ("dst", "src", "token", "transactionId", "tokenId");
        `, { transaction });
        transaction.commit();
    } catch(error) {
      console.log(error);
      await transaction.rollback();
    }
  },

  async down (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
        await queryInterface.sequelize.query(`
            ALTER TABLE ONLY token_transfers
            DROP CONSTRAINT unique_dst_src_token_transactionId_tokenId_token_transfers
        `, { transaction });

        await queryInterface.sequelize.query(`
            ALTER TABLE ONLY token_transfers
            ADD CONSTRAINT unique_dst_src_token_transactionId_token_transfers
            UNIQUE ("dst", "src", "token", "transactionId");
        `, { transaction });
        transaction.commit();
    } catch(error) {
      console.log(error);
      await transaction.rollback();
    }
  }
};
