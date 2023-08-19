'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn('transactions', 'confirmations');
      await queryInterface.changeColumn('transactions', 'v', {
        type: Sequelize.STRING,
        allowNull: true
      });

      await transaction.commit();
    } catch(error) {
      console.log(error);
      await transaction.rollback();
      throw error;
    }
  },

  async down (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn('transactions', 'confirmations', {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1
      });
      await queryInterface.changeColumn('transactions', 'v', {
        type: Sequelize.STRING,
        allowNull: false
      });

      await transaction.commit();
    } catch(error) {
      console.log(error);
      await transaction.rollback();
      throw error;
  }
  }
};
