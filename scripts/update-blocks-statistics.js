#!/usr/bin/env node
/**
 * @fileoverview Update database statistics for the blocks hypertable.
 * Fixes performance regression in removeStalledBlock job caused by stale statistics.
 *
 * The blocks table (159M+ rows) hasn't been analyzed since March 9th, causing
 * PostgreSQL query planner to use outdated statistics and choose suboptimal
 * execution plans for workspaceId + id lookups.
 *
 * @see GitHub issue #788 - Sentry performance regression
 */

const { sequelize } = require('../run/models');
const logger = require('../run/lib/logger');

const updateBlocksStatistics = async () => {
    try {
        logger.info('Starting blocks table statistics update...');

        // Check current statistics age
        const [statsResults] = await sequelize.query(`
            SELECT
                schemaname,
                relname,
                n_live_tup,
                last_autoanalyze,
                EXTRACT(EPOCH FROM (NOW() - last_autoanalyze))/3600 AS hours_since_analyze
            FROM pg_stat_user_tables
            WHERE relname = 'blocks'
        `);

        const stats = statsResults[0];
        if (stats) {
            logger.info('Current blocks table statistics:', {
                liveRows: stats.n_live_tup,
                lastAnalyze: stats.last_autoanalyze,
                hoursSinceAnalyze: Math.round(stats.hours_since_analyze * 10) / 10
            });
        }

        // Update table statistics
        logger.info('Running ANALYZE on blocks table...');
        const startTime = Date.now();

        await sequelize.query('ANALYZE blocks');

        const duration = Date.now() - startTime;
        logger.info(`ANALYZE completed in ${duration}ms`);

        // Verify updated statistics
        const [updatedStats] = await sequelize.query(`
            SELECT
                last_autoanalyze,
                last_analyze,
                EXTRACT(EPOCH FROM (NOW() - COALESCE(last_analyze, last_autoanalyze)))/3600 AS hours_since_latest_analyze
            FROM pg_stat_user_tables
            WHERE relname = 'blocks'
        `);

        const updated = updatedStats[0];
        if (updated) {
            logger.info('Updated statistics:', {
                lastAnalyze: updated.last_analyze,
                hoursSinceAnalyze: Math.round(updated.hours_since_latest_analyze * 10) / 10
            });
        }

        logger.info('✅ Blocks table statistics updated successfully');

    } catch (error) {
        logger.error('❌ Failed to update blocks table statistics:', error);
        throw error;
    } finally {
        await sequelize.close();
    }
};

// Run if called directly
if (require.main === module) {
    updateBlocksStatistics()
        .then(() => {
            console.log('Statistics update completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Statistics update failed:', error);
            process.exit(1);
        });
}

module.exports = updateBlocksStatistics;