'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('transaction_trace_steps', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      transactionId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
            key: 'id',
            model: {
                tableName: 'transactions'
            }
        },
        onDelete: 'CASCADE'
      },
      address: {
        type: Sequelize.STRING,
        allowNull: false
      },
      contractHashedBytecode: {
        type: Sequelize.STRING,
        allowNull: false
      },
      depth: {
        type: Sequelize.INTEGER
      },
      input: {
        type: Sequelize.STRING
      },
      op: {
        type: Sequelize.STRING,
        allowNull: false
      },
      returnData: {
        type: Sequelize.STRING
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('transaction_trace_steps');
  }
};