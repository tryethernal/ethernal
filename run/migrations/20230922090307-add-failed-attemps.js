'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn('rpc_health_checks', 'failedAttempts', {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0
      }, { transaction });

      await queryInterface.addColumn('explorers', 'shouldSync', {
        type: Sequelize.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
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
        await queryInterface.removeColumn('rpc_health_checks', 'failedAttempts', { transaction });
        await queryInterface.removeColumn('explorers', 'shouldSync', { transaction });

        await transaction.commit();
    } catch(error) {
        console.log(error);
        await transaction.rollback();
        throw error;
    }
  }
};
