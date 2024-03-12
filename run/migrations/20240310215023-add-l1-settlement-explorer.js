'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn('explorers', 'l1Explorer', {
        type: Sequelize.DataTypes.STRING,
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn('blocks', 'l1BlockNumber', {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: true,
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
          await queryInterface.removeColumn('explorers', 'l1Explorer', { transaction });
          await queryInterface.removeColumn('blocks', 'l1BlockNumber', { transaction });

          await transaction.commit();
      } catch(error) {
          console.log(error);
          await transaction.rollback();
          throw error;
      }
  }
};
