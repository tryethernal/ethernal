const { enqueue } = require('./lib/queue');

const INTEGRITY_CHECK_INTERVAL = 5 * 60 * 1000;
const RPC_HEALTH_CHECK_INTERVAL = 5 * 60 * 1000;
const SUBSCRIPTION_CHECK_INTERVAL = 5 * 60 * 1000;
const CANCEL_DEMO_INTERVAL = 60 * 60 * 1000;

(async () => {
    await enqueue(
        'cancelDemoExplorers',
        'cancelDemoExplorers',
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
})();
