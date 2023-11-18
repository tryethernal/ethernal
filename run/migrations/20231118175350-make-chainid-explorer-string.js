'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.changeColumn('explorers', 'chainId', {
          type: Sequelize.STRING,
          allowNull: false
      }, { transaction });

      await queryInterface.changeColumn('transactions', 'chainId', {
        type: Sequelize.INTEGER,
        allowNull: true
      }, { transaction });
      await transaction.commit();
    } catch(error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down (queryInterface, Sequelize) {
  }
};
