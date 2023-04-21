const jobs = require('./jobs');
const { enqueue } = require('./lib/queue');

const INTEGRITY_CHECK_INTERVAL = 30 * 1000;
const RPC_HEALTH_CHECK_INTERVAL = 5 * 1000;

(async () => {
    await enqueue(
        'enforceDataRetentionForWorkspace',
        'enforceDataRetentionForWorkspace',
        {},
        10,
        { pattern: '0 0 * * *' }
    );

    await enqueue(
        'integrityCheckStarter',
        'integrityCheckStarter',
        {},
        10,
        { every: INTEGRITY_CHECK_INTERVAL }
    );

    await enqueue(
        'rpcHealthCheckStarter',
        'rpcHealthCheckStarter',
        {},
        10,
        { every: RPC_HEALTH_CHECK_INTERVAL }
    );
})();
