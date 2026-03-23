/**
 * @fileoverview Add index on orbit_chain_configs.parentWorkspaceId to optimize workspace queries
 * This fixes a performance issue where the workspace JOIN queries were slow due to missing index
 * @module migrations
 */

'use strict';

module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(
            'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orbit_chain_configs_parent_workspace_id ON orbit_chain_configs ("parentWorkspaceId")'
        );
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query(
            'DROP INDEX CONCURRENTLY IF EXISTS idx_orbit_chain_configs_parent_workspace_id'
        );
    }
};

module.exports.config = { transaction: false }; // CONCURRENTLY fails inside transactions