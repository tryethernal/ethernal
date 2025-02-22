'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
        await queryInterface.changeColumn('transactions', 'r', {
            type: Sequelize.STRING,
            allowNull: true
        }, { transaction });

        await queryInterface.changeColumn('transactions', 's', {
            type: Sequelize.STRING,
            allowNull: true
        }, { transaction });

        await queryInterface.changeColumn('transactions', 'v', {
          type: Sequelize.STRING,
          allowNull: true
      }, { transaction });

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
        await queryInterface.changeColumn('transactions', 'r', {
            type: Sequelize.STRING,
            allowNull: false
        }, { transaction });

        await queryInterface.changeColumn('transactions', 's', {
            type: Sequelize.STRING,
            allowNull: false
        }, { transaction });

        await queryInterface.changeColumn('transactions', 'v', {
            type: Sequelize.STRING,
            allowNull: false
        }, { transaction });

        await transaction.commit();
    } catch(error) {
        console.log(error);
        await transaction.rollback();
        throw error;
    }
  }
};
