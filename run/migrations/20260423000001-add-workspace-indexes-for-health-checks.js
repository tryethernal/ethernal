/**
 * @fileoverview Add missing workspaceId indexes for health check tables to optimize workspace queries
 */

'use strict';

module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(
            'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rpc_health_checks_workspace_id ON rpc_health_checks ("workspaceId")'
        );
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
