const { enqueue } = require('./lib/queue');

const INTEGRITY_CHECK_INTERVAL = 5 * 60 * 1000;
const RPC_HEALTH_CHECK_INTERVAL = 5 * 60 * 1000;
const SUBSCRIPTION_CHECK_INTERVAL = 5 * 60 * 1000;
const CANCEL_DEMO_INTERVAL = 60 * 60 * 1000;
const MV_TO_REFRESH = ['transaction_volume_14d', 'wallet_volume_14d'];

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

    for (let i = 0; i < MV_TO_REFRESH.length; i++)
        await enqueue(
            'refreshMaterializedViews',
            `refreshMaterializedView-${MV_TO_REFRESH[i]}`,
            { view: MV_TO_REFRESH[i] },
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
