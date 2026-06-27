/**
 * @fileoverview Backfill nextRecoveryCheckAt for explorers that were permanently
 * stuck at max recovery attempts.
 *
 * Before the indefinite-retry change, scheduleNextRecoveryCheck set
 * nextRecoveryCheckAt = NULL once an explorer hit MAX_RECOVERY_ATTEMPTS, which
 * permanently excluded it from the syncRecoveryCheck query (NULL <= now() is
 * never true). Those explorers can never self-recover without this one-time
 * backfill. We stagger the scheduled checks over the next 24h to avoid a
 * thundering herd of RPC checks when the recovery job next runs.
 *
 * Only auto-disabled explorers (syncDisabledReason IS NOT NULL) are touched;
 * intentionally pruned explorers (e.g. infra-prune-*) keep their NULL value so
 * they stay excluded.
 */

'use strict';

module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(`
            UPDATE explorers
            SET "nextRecoveryCheckAt" = now() + (random() * interval '24 hours'),
                "updatedAt" = now()
            WHERE "syncDisabledReason" = 'max_recovery_attempts_reached'
              AND "nextRecoveryCheckAt" IS NULL
        `);
    },

    async down() {
        // No-op: re-stuck rows would naturally return to NULL via the old code
        // path, and we have no record of which rows were NULL before. The
        // backfill is idempotent and safe to leave in place.
    }
};
