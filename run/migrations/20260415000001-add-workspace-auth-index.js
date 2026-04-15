'use strict';

module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(
            `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspaces_userid_name_not_pending
             ON workspaces ("userId", name)
             WHERE "pendingDeletion" = false`
        );
    },
    async down(queryInterface) {
        await queryInterface.sequelize.query(
            'DROP INDEX CONCURRENTLY IF EXISTS idx_workspaces_userid_name_not_pending'
        );
    }
};
module.exports.config = { transaction: false };
