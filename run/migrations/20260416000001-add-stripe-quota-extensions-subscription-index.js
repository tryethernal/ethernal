'use strict';

module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(
            `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stripe_quota_extensions_stripe_subscription_id
             ON stripe_quota_extensions ("stripeSubscriptionId")`
        );
    },
    async down(queryInterface) {
        await queryInterface.sequelize.query(
            'DROP INDEX CONCURRENTLY IF EXISTS idx_stripe_quota_extensions_stripe_subscription_id'
        );
    }
};
module.exports.config = { transaction: false };