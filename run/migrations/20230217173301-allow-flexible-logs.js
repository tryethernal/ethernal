'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
        await queryInterface.changeColumn('transaction_logs', 'address', { type: Sequelize.STRING, allowNull: true }, { transaction });
        await queryInterface.changeColumn('transaction_logs', 'blockHash', { type: Sequelize.STRING, allowNull: true }, { transaction });
        await queryInterface.changeColumn('transaction_logs', 'blockNumber', { type: Sequelize.INTEGER, allowNull: true }, { transaction });
        await queryInterface.changeColumn('transaction_logs', 'data', { type: Sequelize.TEXT, allowNull: true }, { transaction });
        await queryInterface.changeColumn('transaction_logs', 'logIndex', { type: Sequelize.INTEGER, allowNull: true }, { transaction });
        await queryInterface.changeColumn('transaction_logs', 'topics', { type: Sequelize.ARRAY(Sequelize.STRING), allowNull: true }, { transaction });
        await queryInterface.changeColumn('transaction_logs', 'transactionHash', { type: Sequelize.STRING, allowNull: true }, { transaction });
        await queryInterface.changeColumn('transaction_logs', 'transactionIndex', { type: Sequelize.INTEGER, allowNull: true }, { transaction });

        await queryInterface.changeColumn('transaction_receipts', 'byzantium', { type: Sequelize.BOOLEAN, allowNull: true }, { transaction });
        await queryInterface.changeColumn('transaction_receipts', 'confirmations', { type: Sequelize.INTEGER, allowNull: true }, { transaction });
        await queryInterface.changeColumn('transaction_receipts', 'type', { type: Sequelize.INTEGER, allowNull: true }, { transaction });

        await transaction.commit();
    } catch(error) {
        console.log(error);
        await transaction.rollback();
    }
  },

  async down (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
        await queryInterface.changeColumn('transaction_logs', 'address', { type: Sequelize.STRING, allowNull: false }, { transaction });
        await queryInterface.changeColumn('transaction_logs', 'blockHash', { type: Sequelize.STRING, allowNull: false }, { transaction });
        await queryInterface.changeColumn('transaction_logs', 'blockNumber', { type: Sequelize.INTEGER, allowNull: false }, { transaction });
        await queryInterface.changeColumn('transaction_logs', 'data', { type: Sequelize.TEXT, allowNull: false }, { transaction });
        await queryInterface.changeColumn('transaction_logs', 'logIndex', { type: Sequelize.INTEGER, allowNull: false }, { transaction });
        await queryInterface.changeColumn('transaction_logs', 'topics', { type: Sequelize.ARRAY(Sequelize.STRING), allowNull: false }, { transaction });
        await queryInterface.changeColumn('transaction_logs', 'transactionHash', { type: Sequelize.STRING, allowNull: false }, { transaction });
        await queryInterface.changeColumn('transaction_logs', 'transactionIndex', { type: Sequelize.INTEGER, allowNull: false }, { transaction });

        await queryInterface.changeColumn('transaction_receipts', 'byzantium', { type: Sequelize.BOOLEAN, allowNull: false }, { transaction });
        await queryInterface.changeColumn('transaction_receipts', 'confirmations', { type: Sequelize.INTEGER, allowNull: false }, { transaction });
        await queryInterface.changeColumn('transaction_receipts', 'type', { type: Sequelize.INTEGER, allowNull: false }, { transaction });

        await transaction.commit();
    } catch(error) {
        console.log(error);
        await transaction.rollback();
    }
  }
};
