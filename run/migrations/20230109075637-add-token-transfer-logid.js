'use strict';
const { getTokenTransfers } = require('../lib/abi');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up (queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            await queryInterface.addColumn('token_transfers', 'transactionLogId', {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    key: 'id',
                    model: {
                      tableName: 'transaction_logs'
                    }
                },
            }, { transaction });

            await queryInterface.addColumn('token_balance_changes', 'tokenTransferId', {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    key: 'id',
                    model: {
                      tableName: 'token_transfers'
                    }
                },
            }, { transaction });

            await queryInterface.sequelize.query(`
                ALTER TABLE ONLY token_balance_changes
                ADD CONSTRAINT unique_tokenTransferId_address
                UNIQUE ("tokenTransferId", "address");
            `, { transaction });
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
            await queryInterface.removeColumn('token_transfers', 'transactionLogId', { transaction });
            await queryInterface.removeColumn('token_balance_changes', 'tokenTransferId', { transaction });
            await queryInterface.sequelize.query(`
                ALTER TABLE ONLY token_balance_changes
                DROP CONSTRAINT unique_tokenTransferId_address
            `);

            await transaction.commit();
        } catch(error) {
            console.log(error);
            await transaction.rollback();
            throw error;
        }
    }
};
