'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
      const transaction = await queryInterface.sequelize.transaction();
      try {
          await queryInterface.changeColumn('transactions ', 'timestamp', {
              type: Sequelize.DATE,
              allowNull: false
          }, { transaction });

          await queryInterface.changeColumn('blocks ', 'timestamp', {
              type: Sequelize.DATE,
              allowNull: false
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
          await queryInterface.changeColumn('transactions ', 'timestamp', {
              type: Sequelize.STRING,
              allowNull: false
          }, { transaction });

          await queryInterface.changeColumn('blocks ', 'timestamp', {
              type: Sequelize.STRING,
              allowNull: false
          }, { transaction });

          await transaction.commit();
      } catch(error) {
          console.log(error)
          await transaction.rollback();
          throw error;
      }
  }
};
