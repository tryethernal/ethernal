/**
 * @fileoverview Refresh table statistics for rpc_health_checks and integrity_checks tables
 * This fixes a performance regression in blockSync where LEFT OUTER JOINs were causing sequential scans
 * due to stale table statistics. Both tables already have UNIQUE constraints on workspaceId that create
 * implicit B-tree indexes, so the issue is likely outdated statistics causing poor query planning.
 * @module migrations
 */

'use strict';

module.exports = {
    async up(queryInterface) {
        // Refresh table statistics for rpc_health_checks
        // Both tables already have UNIQUE constraints on workspaceId which create implicit B-tree indexes
        // The performance issue is likely due to stale statistics, not missing indexes
        await queryInterface.sequelize.query('ANALYZE rpc_health_checks');

        // Refresh table statistics for integrity_checks
        await queryInterface.sequelize.query('ANALYZE integrity_checks');
    },

    async down(queryInterface) {
        // ANALYZE cannot be rolled back, but it's safe and only improves performance
        // No action needed
    }
};

module.exports.config = { transaction: false }; // ANALYZE updates stats in-place; no rollback possible