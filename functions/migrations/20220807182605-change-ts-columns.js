'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
      const transaction = await queryInterface.sequelize.transaction();
      try {
          await queryInterface.sequelize.query(`
              ALTER TABLE "transactions"
              ALTER COLUMN "timestamp" SET NOT NULL;
              ALTER TABLE "transactions"
              ALTER COLUMN "timestamp" DROP DEFAULT;
              ALTER TABLE "transactions"
              ALTER COLUMN "timestamp" TYPE TIMESTAMP WITH TIME ZONE USING TO_TIMESTAMP(timestamp::INTEGER);`
            , { transaction });

          await queryInterface.sequelize.query(`
              ALTER TABLE "blocks"
              ALTER COLUMN "timestamp" SET NOT NULL;
              ALTER TABLE "blocks"
              ALTER COLUMN "timestamp" DROP DEFAULT;
              ALTER TABLE "blocks"
              ALTER COLUMN "timestamp" TYPE TIMESTAMP WITH TIME ZONE USING TO_TIMESTAMP(timestamp::INTEGER);`
            , { transaction });

          await transaction.commit();
      } catch(error) {
          console.log(error)
          await transaction.rollback();
          throw error;
      }
  },

  async down (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
      try {
          await queryInterface.sequelize.query(`
              ALTER TABLE "transactions"
              ALTER COLUMN "timestamp" SET NOT NULL;
              ALTER TABLE "transactions"
              ALTER COLUMN "timestamp" DROP DEFAULT;
              ALTER TABLE "transactions"
              ALTER COLUMN "timestamp" TYPE VARCHAR USING EXTRACT(epoch FROM timestamp);`
            , { transaction });

          await queryInterface.sequelize.query(`
              ALTER TABLE "blocks"
              ALTER COLUMN "timestamp" SET NOT NULL;
              ALTER TABLE "blocks"
              ALTER COLUMN "timestamp" DROP DEFAULT;
              ALTER TABLE "blocks"
              ALTER COLUMN "timestamp" TYPE VARCHAR USING EXTRACT(epoch FROM timestamp);`
            , { transaction });

          await transaction.commit();
      } catch(error) {
          console.log(error)
          await transaction.rollback();
          throw error;
      }
  }
};
