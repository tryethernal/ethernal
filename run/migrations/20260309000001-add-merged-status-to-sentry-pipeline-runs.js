'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_sentry_pipeline_runs_status" ADD VALUE IF NOT EXISTS 'merged' AFTER 'merging'`
    );
  },

  async down() {
    // PostgreSQL does not support removing values from ENUMs.
    // The 'merged' value will remain but be unused after rollback.
  }
};
