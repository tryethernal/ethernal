'use strict';

module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(
            `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_blockid_state_ready
             ON transactions ("blockId")
             WHERE state = 'ready'`
        );
    },
    async down(queryInterface) {
        await queryInterface.sequelize.query(
            'DROP INDEX CONCURRENTLY IF EXISTS idx_transactions_blockid_state_ready'
        );
    }
};
module.exports.config = { transaction: false };
