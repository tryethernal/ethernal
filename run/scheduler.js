const { enqueue } = require('./lib/queue');

const INTEGRITY_CHECK_INTERVAL = 5 * 60 * 1000;
const RPC_HEALTH_CHECK_INTERVAL = 5 * 60 * 1000;
const SUBSCRIPTION_CHECK_INTERVAL = 5 * 60 * 1000;
const QUEUE_MONITORING_INTERVAL = 60 * 1000;
const CANCEL_DEMO_INTERVAL = 60 * 60 * 1000;
const BLOCK_SYNC_MONITORING_INTERVAL = 60 * 1000;

(async () => {
    await enqueue(
        'removeExpiredExplorers',
        'removeExpiredExplorers',
        {},
        10,
        { every: CANCEL_DEMO_INTERVAL }
    );

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

    await enqueue(
        'explorerSyncCheck',
        'explorerSyncCheck',
        {},
        10,
        { every: SUBSCRIPTION_CHECK_INTERVAL }
    );

    await enqueue(
        'queueMonitoring',
        'queueMonitoring',
        {},
        10,
        { every: QUEUE_MONITORING_INTERVAL }
    );

    await enqueue(
        'blockSyncMonitoring',
        'blockSyncMonitoring',
        {},
        10,
        { every: BLOCK_SYNC_MONITORING_INTERVAL }
    );
})();
