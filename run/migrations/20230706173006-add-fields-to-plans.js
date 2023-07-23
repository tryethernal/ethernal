'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn('stripe_plans', 'price', {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: false,
      }, { transaction });

      await queryInterface.addColumn('stripe_plans', 'public', {
        type: Sequelize.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }, { transaction });

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
      await queryInterface.removeColumn('stripe_plans', 'price', { transaction });
      await queryInterface.removeColumn('stripe_plans', 'public', { transaction });

      await transaction.commit();
    } catch(error) {
      console.log(error)
      await transaction.rollback();
      throw error;
    }
  }
};
