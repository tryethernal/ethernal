'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn('stripe_subscriptions', 'cycleEndsAt', {
        type: Sequelize.DataTypes.DATE,
        allowNull: false
      }, { transaction });

      await queryInterface.addColumn('stripe_subscriptions', 'status', {
        type: Sequelize.DataTypes.ENUM('active', 'pending_cancelation'),
        allowNull: false,
        defaultValue: 'active'
      }, { transaction });

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
        await queryInterface.removeColumn('stripe_subscriptions', 'cycleEndsAt', { transaction });
        await queryInterface.removeColumn('stripe_subscriptions', 'status', { transaction });
        await queryInterface.sequelize.query('DROP TYPE enum_stripe_subscriptions_status;', { transaction });

        await transaction.commit();
      } catch(error) {
          console.log(error);
          await transaction.rollback();
          throw error;
      }
  }
};