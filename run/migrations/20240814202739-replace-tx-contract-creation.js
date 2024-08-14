'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
        await queryInterface.removeColumn('contracts', 'creationTransactionHash', { transaction });

        await queryInterface.addColumn('contracts', 'transactionId', {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: true,
            references: {
              key: 'id',
              model: {
                  tableName: 'transactions'
              }
            },
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
        await queryInterface.addColumn('contracts', 'creationTransactionHash', {
          type: Sequelize.DataTypes.STRING,
          allowNull: true
        }, { transaction });
        await queryInterface.removeColumn('contracts', 'transactionId', { transaction });

          await transaction.commit();
      } catch(error) {
          console.log(error);
          await transaction.rollback();
          throw error;
      }
  }
};
