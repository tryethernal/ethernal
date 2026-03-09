/**
 * @fileoverview Add index on transactions.state using CONCURRENTLY.
 * The transactions table has ~94M rows / 141 GB — standard CREATE INDEX
 * would lock the table. CONCURRENTLY avoids locks but cannot run inside
 * a transaction, so this migration disables the Sequelize transaction wrapper.
 * @module migrations/add-transactions-state-index-concurrently
 */

'use strict';

module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(
            'CREATE INDEX CONCURRENTLY IF NOT EXISTS transactions_state_idx ON transactions (state)'
        );
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query(
            'DROP INDEX CONCURRENTLY IF EXISTS transactions_state_idx'
        );
    }
};

module.exports.config = { transaction: false };
