'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
        await queryInterface.addColumn('users', 'canTrial', {
          type: Sequelize.DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true
        }, { transaction });

        await queryInterface.sequelize.query(`
          ALTER TYPE "enum_stripe_subscriptions_status"
          ADD VALUE IF NOT EXISTS 'trial';
        `, { transaction });

        await queryInterface.sequelize.query(`
          ALTER TYPE "enum_stripe_subscriptions_status"
          ADD VALUE IF NOT EXISTS 'trial_with_card';
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
          await queryInterface.removeColumn('users', 'canTrial', { transaction });

          await transaction.commit();
      } catch(error) {
          console.log(error);
          await transaction.rollback();
          throw error;
      }
  }
};
