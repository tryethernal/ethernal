require('../mocks/lib/logger');
require('../mocks/lib/opsgenie');

const { createIncident } = require('../../lib/opsgenie');

let mockQuery;

jest.mock('../../lib/redis', () => ({
    ping: jest.fn().mockResolvedValue('PONG'),
    info: jest.fn().mockResolvedValue('used_memory:100\nmaxmemory:0\n'),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    eval: jest.fn().mockResolvedValue(1)
}));

jest.mock('../../models', () => ({
    sequelize: { query: (...args) => mockQuery(...args) }
}));

const infraHealthCheck = require('../../jobs/infraHealthCheck');

/**
 * Builds the single row returned by the replication/archiving probe.
 * @param {Object} overrides - Fields to override on the healthy baseline
 * @returns {Array} Sequelize-shaped result
 */
const replicationRow = (overrides) => ([[Object.assign({
    in_recovery: false,
    standby_count: '1',
    max_replay_lag_seconds: '0.5',
    wal_archive_age_seconds: '30',
    wal_archive_failed_count: '0'
}, overrides || {})]]);

describe('infraHealthCheck - replication and WAL archiving', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        delete process.env.REPLICATION_MONITORING_ENABLED;
        delete process.env.REPLICATION_LAG_ALERT_SECONDS;
        delete process.env.WAL_ARCHIVE_STALE_ALERT_SECONDS;
        // First call is checkPostgres' SELECT 1, second is the replication probe.
        mockQuery = jest.fn()
            .mockResolvedValueOnce([[{ '?column?': 1 }]])
            .mockResolvedValueOnce(replicationRow());
    });

    it('Should not alert when replication and archiving are healthy', async () => {
        const result = await infraHealthCheck();

        expect(result.replication.status).toEqual('ok');
        expect(result.replication.standbyCount).toEqual(1);
        expect(createIncident).not.toHaveBeenCalled();
    });

    it('Should raise P1 when no standby is attached', async () => {
        mockQuery = jest.fn()
            .mockResolvedValueOnce([[{ '?column?': 1 }]])
            .mockResolvedValueOnce(replicationRow({ standby_count: '0' }));

        const result = await infraHealthCheck();

        expect(result.replication.status).toEqual('no-standby');
        expect(createIncident).toHaveBeenCalledWith(
            'PostgreSQL has no streaming standby',
            expect.stringContaining('no failover target'),
            'P1',
            { alias: 'infra-postgres-no-standby' }
        );
    });

    it('Should raise P2 when replay lag exceeds the threshold', async () => {
        mockQuery = jest.fn()
            .mockResolvedValueOnce([[{ '?column?': 1 }]])
            .mockResolvedValueOnce(replicationRow({ max_replay_lag_seconds: '600' }));

        const result = await infraHealthCheck();

        expect(result.replication.status).toEqual('lagging');
        expect(createIncident).toHaveBeenCalledWith(
            'PostgreSQL replication lag high',
            expect.stringContaining('600s'),
            'P2',
            { alias: 'infra-postgres-replication-lag' }
        );
    });

    it('Should raise P1 when WAL archiving has stalled', async () => {
        mockQuery = jest.fn()
            .mockResolvedValueOnce([[{ '?column?': 1 }]])
            .mockResolvedValueOnce(replicationRow({ wal_archive_age_seconds: '1800' }));

        const result = await infraHealthCheck();

        expect(result.replication.status).toEqual('archive-stale');
        expect(createIncident).toHaveBeenCalledWith(
            'PostgreSQL WAL archiving stalled',
            expect.stringContaining('Point-in-time recovery is frozen'),
            'P1',
            { alias: 'infra-postgres-wal-archive-stale' }
        );
    });

    it('Should raise P1 when nothing has ever been archived', async () => {
        mockQuery = jest.fn()
            .mockResolvedValueOnce([[{ '?column?': 1 }]])
            .mockResolvedValueOnce(replicationRow({ wal_archive_age_seconds: null }));

        const result = await infraHealthCheck();

        expect(result.replication.status).toEqual('archive-stale');
        expect(createIncident).toHaveBeenCalledWith(
            'PostgreSQL WAL archiving stalled',
            expect.stringContaining('has ever been archived'),
            'P1',
            { alias: 'infra-postgres-wal-archive-stale' }
        );
    });

    it('Should skip silently when connected to a standby rather than alerting', async () => {
        mockQuery = jest.fn()
            .mockResolvedValueOnce([[{ '?column?': 1 }]])
            .mockResolvedValueOnce(replicationRow({ in_recovery: true }));

        const result = await infraHealthCheck();

        expect(result.replication.status).toEqual('skipped');
        expect(createIncident).not.toHaveBeenCalled();
    });

    it('Should respect a raised lag threshold', async () => {
        process.env.REPLICATION_LAG_ALERT_SECONDS = '900';
        mockQuery = jest.fn()
            .mockResolvedValueOnce([[{ '?column?': 1 }]])
            .mockResolvedValueOnce(replicationRow({ max_replay_lag_seconds: '600' }));

        const result = await infraHealthCheck();

        expect(result.replication.status).toEqual('ok');
        expect(createIncident).not.toHaveBeenCalled();
    });

    it('Should be disableable', async () => {
        process.env.REPLICATION_MONITORING_ENABLED = 'false';

        const result = await infraHealthCheck();

        expect(result.replication.status).toEqual('skipped');
        expect(createIncident).not.toHaveBeenCalled();
    });

    it('Should alert rather than fail silently when the check itself errors', async () => {
        mockQuery = jest.fn()
            .mockResolvedValueOnce([[{ '?column?': 1 }]])
            .mockRejectedValueOnce(new Error('permission denied for view pg_stat_replication'));

        const result = await infraHealthCheck();

        expect(result.replication.status).toEqual('unhealthy');
        expect(createIncident).toHaveBeenCalledWith(
            'PostgreSQL replication check failed',
            expect.stringContaining('permission denied'),
            'P2',
            { alias: 'infra-postgres-replication-check-failed' }
        );
    });
});
