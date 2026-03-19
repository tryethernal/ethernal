'use strict';

/**
 * Add index on workspaces.userId to optimize JOINs with users table
 * Fixes slow database queries in blockSync that were taking 2+ seconds
 */
module.exports = {
    async up(queryInterface) {
        // Add index for efficient JOIN between workspaces and users tables
        await queryInterface.sequelize.query(
            'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspaces_user_id ON workspaces ("userId")'
        );
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query(
            'DROP INDEX CONCURRENTLY IF EXISTS idx_workspaces_user_id'
        );
    }
};

// CONCURRENTLY operations must run outside of transactions
module.exports.config = { transaction: false };