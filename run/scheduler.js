const { enqueue } = require('./lib/queue');
const { isDripEmailEnabled, isProspectingEnabled, isSelfHosted } = require('./lib/flags');

const PROSPECT_CHECK_INTERVAL = 15 * 60 * 1000;
const DRIP_EMAIL_CHECK_INTERVAL = 15 * 60 * 1000;
const INTEGRITY_CHECK_INTERVAL = 5 * 60 * 1000;
const RPC_HEALTH_CHECK_INTERVAL = 5 * 60 * 1000;
const SUBSCRIPTION_CHECK_INTERVAL = 5 * 60 * 1000;
const SYNC_RECOVERY_CHECK_INTERVAL = 5 * 60 * 1000;
const QUEUE_MONITORING_INTERVAL = 120 * 1000; // Reduced from 60s to 120s to reduce Redis N+1 call frequency
const CANCEL_DEMO_INTERVAL = 60 * 60 * 1000;
const BLOCK_SYNC_MONITORING_INTERVAL = 60 * 1000;
const INFRA_HEALTH_CHECK_INTERVAL = 60 * 1000;

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
        'syncRecoveryCheck',
        'syncRecoveryCheck',
        {},
        10,
        { every: SYNC_RECOVERY_CHECK_INTERVAL }
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

    await enqueue(
        'finalizePendingOrbitBatches',
        'finalizePendingOrbitBatches',
        {},
        10,
        { every: 30 * 1000 }
    );

    await enqueue(
        'checkOrbitMessageDeliveredLogs',
        'checkOrbitMessageDeliveredLogs',
        {},
        10,
        { every: 5 * 60 * 1000 }
    );

    await enqueue(
        'checkOpDepositLogs',
        'checkOpDepositLogs',
        {},
        10,
        { every: 5 * 60 * 1000 }
    );

    await enqueue(
        'checkCustomL1ParentSync',
        'checkCustomL1ParentSync',
        {},
        10,
        { every: 5 * 60 * 1000 }
    );

    // OP Stack jobs
    await enqueue(
        'finalizePendingOpBatches',
        'finalizePendingOpBatches',
        {},
        10,
        { every: 30 * 1000 } // Check every 30 seconds
    );

    await enqueue(
        'finalizePendingOpOutputs',
        'finalizePendingOpOutputs',
        {},
        10,
        { every: 60 * 1000 } // Check every minute
    );

    await enqueue(
        'linkOpDepositsToL2Txs',
        'linkOpDepositsToL2Txs',
        {},
        10,
        { every: 30 * 1000 } // Check every 30 seconds
    );

    await enqueue(
        'infraHealthCheck',
        'infraHealthCheck',
        {},
        10,
        { every: INFRA_HEALTH_CHECK_INTERVAL }
    );

    if (isDripEmailEnabled() && !isSelfHosted()) {
        await enqueue(
            'processDripEmails',
            'processDripEmails',
            {},
            10,
            { every: DRIP_EMAIL_CHECK_INTERVAL }
        );
    }

    if (isProspectingEnabled() && !isSelfHosted()) {
        await enqueue(
            'processDetectedProspects',
            'processDetectedProspects',
            {},
            10,
            { every: PROSPECT_CHECK_INTERVAL }
        );
    }
})();
