'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {

        await queryInterface.sequelize.query(`
            ALTER TABLE "transaction_logs"
                ALTER COLUMN "data" TYPE TEXT;
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
