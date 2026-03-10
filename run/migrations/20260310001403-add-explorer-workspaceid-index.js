/**
 * @fileoverview Adds index on explorers.workspaceId for optimizing workspace->explorer joins.
 * Uses CREATE INDEX CONCURRENTLY to avoid blocking writes on production.
 * @module migrations/20260310001403-add-explorer-workspaceid-index
 */

'use strict';

module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(
            'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_explorers_workspace_id ON explorers ("workspaceId")'
        );
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query(
            'DROP INDEX CONCURRENTLY IF EXISTS idx_explorers_workspace_id'
        );
    }
};

module.exports.config = { transaction: false };
