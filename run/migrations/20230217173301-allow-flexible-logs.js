'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {

        await queryInterface.sequelize.query(`
            ALTER TABLE "transaction_logs"
                ALTER COLUMN "address" DROP NOT NULL,
                ALTER COLUMN "blockHash" DROP NOT NULL,
                ALTER COLUMN "data" DROP NOT NULL,
                ALTER COLUMN "logIndex" DROP NOT NULL,
                ALTER COLUMN "topics" DROP NOT NULL,
                ALTER COLUMN "transactionHash" DROP NOT NULL,
                ALTER COLUMN "transactionIndex" DROP NOT NULL;

            ALTER TABLE "transaction_receipts"
                ALTER COLUMN "byzantium" DROP NOT NULL,
                ALTER COLUMN "confirmations" DROP NOT NULL,
                ALTER COLUMN "type" DROP NOT NULL;
        `, { transaction });

        await transaction.commit();
    } catch(error) {
        console.log(error);
        await transaction.rollback();
    }
  },

  async down (queryInterface, Sequelize) {
    
  }
};
