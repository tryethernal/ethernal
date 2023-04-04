'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
        await queryInterface.addColumn('blocks', 'state', {
            type: Sequelize.DataTypes.ENUM('syncing', 'ready'),
            allowNull: false,
            defaultValue: 'ready'
        });

        await queryInterface.addColumn('transactions', 'state', {
            type: Sequelize.DataTypes.ENUM('syncing', 'ready'),
            allowNull: false,
            defaultValue: 'ready'
        });

        await transaction.commit();
    } catch(error) {
      console.log(error)
      await transaction.rollback();
      throw error;
    }
  },
  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
        await queryInterface.removeColumn('blocks', 'state');
        await queryInterface.removeColumn('transactions', 'state');

        await transaction.commit();
    } catch(error) {
      console.log(error)
      await transaction.rollback();
      throw error;
    }
  }
};
