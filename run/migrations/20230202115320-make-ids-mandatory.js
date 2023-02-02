'use strict';
const { getTokenTransfers } = require('../lib/abi');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up (queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            await queryInterface.changeColumn('token_transfers', 'transactionLogId', {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    key: 'id',
                    model: {
                      tableName: 'transaction_logs'
                    }
                },
            }, { transaction });

            await queryInterface.changeColumn('token_balance_changes', 'tokenTransferId', {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    key: 'id',
                    model: {
                      tableName: 'token_transfers'
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

    async down (queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            await queryInterface.changeColumn('token_transfers', 'transactionLogId', {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    key: 'id',
                    model: {
                      tableName: 'transaction_logs'
                    }
                },
            }, { transaction });

            await queryInterface.changeColumn('token_balance_changes', 'tokenTransferId', {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    key: 'id',
                    model: {
                      tableName: 'token_transfers'
                    }
                },
            }, { transaction });

            await transaction.commit();
        } catch(error) {
            console.log(error);
            await transaction.rollback();
            throw error;
        }
    }
};
