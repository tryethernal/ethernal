/**
 * @fileoverview Updates demo plan expiration from 1 day to 7 days.
 * @module migrations/20260315000003-update-demo-plan-expiration
 */

'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE "stripe_plans"
      SET capabilities = jsonb_set(capabilities, '{expiresAfter}', '7')
      WHERE capabilities->>'expiresAfter' = '1'
        AND slug LIKE '%demo%'
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE "stripe_plans"
      SET capabilities = jsonb_set(capabilities, '{expiresAfter}', '1')
      WHERE capabilities->>'expiresAfter' = '7'
        AND slug LIKE '%demo%'
    `);
  }
};
