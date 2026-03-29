/**
 * Adds DESC index on blocks table for efficient ORDER BY number DESC queries.
 *
 * The blocks table (TimescaleDB hypertable with ~173M rows) was experiencing slow queries
 * for GET /api/blocks endpoint when ordering by number DESC. The existing ascending index
 * on (workspaceId, number) is not efficient for DESC ordering.
 *
 * This index specifically optimizes:
 * - GET /api/blocks with ORDER BY number DESC
 * - Block pagination with descending order
 *
 * Related: Sentry issue #113, GitHub issue #974
 */
'use strict';

module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(
            'CREATE INDEX CONCURRENTLY IF NOT EXISTS blocks_workspace_id_number_desc ON blocks ("workspaceId", number DESC)'
        );
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query('DROP INDEX CONCURRENTLY IF EXISTS blocks_workspace_id_number_desc');
    }
};

// CONCURRENTLY operations cannot run inside transactions
module.exports.config = { transaction: false };