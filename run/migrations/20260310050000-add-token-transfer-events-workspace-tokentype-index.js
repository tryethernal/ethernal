'use strict';

/**
 * Adds a composite index on (workspaceId, tokenType) to token_transfer_events.
 * This speeds up the tokenTransfers endpoint which filters by workspaceId and tokenType
 * but was doing sequential scans across all hypertable chunks (~104 chunks, ~1.3s).
 */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(
            'CREATE INDEX IF NOT EXISTS idx_token_transfer_events_workspace_tokentype ON token_transfer_events ("workspaceId", "tokenType")'
        );
    },
    async down(queryInterface) {
        await queryInterface.sequelize.query(
            'DROP INDEX IF EXISTS idx_token_transfer_events_workspace_tokentype'
        );
    }
};

// Note: Using standard CREATE INDEX (not CONCURRENTLY) because TimescaleDB hypertables don't support concurrent index creation
