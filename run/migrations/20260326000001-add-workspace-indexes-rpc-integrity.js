/**
 * @fileoverview Add missing indexes on workspaceId for rpc_health_checks and integrity_checks tables
 * This fixes a performance regression in blockSync where LEFT OUTER JOINs were causing sequential scans
 * due to missing foreign key indexes, resulting in slow database queries (54ms+).
 * @module migrations
 */

'use strict';

module.exports = {
    async up(queryInterface) {
        // Add index on rpc_health_checks.workspaceId
        await queryInterface.sequelize.query(
            'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rpc_health_checks_workspace_id ON rpc_health_checks ("workspaceId")'
        );

        // Add index on integrity_checks.workspaceId
        await queryInterface.sequelize.query(
            'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_integrity_checks_workspace_id ON integrity_checks ("workspaceId")'
        );
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query(
            'DROP INDEX CONCURRENTLY IF EXISTS idx_rpc_health_checks_workspace_id'
        );

        await queryInterface.sequelize.query(
            'DROP INDEX CONCURRENTLY IF EXISTS idx_integrity_checks_workspace_id'
        );
    }
};

module.exports.config = { transaction: false }; // CONCURRENTLY fails inside transactions