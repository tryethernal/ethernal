const hostedPriorities = {
    high: [
        'blockSync',
        'processBlock',
        'batchBlockSync',
        'sendResetPasswordEmail',
        'updateExplorerSyncingProcess',
        'receiptSync',
        'storeOrbitDeposit',
        'storeOpDeposit',
        'storeOpOutput',
        'checkCustomL1ParentSync',
        'startCustomL1ParentSync',
        'removeStalledBlock',
        'updateApproximatedRecord',
        'increaseStripeBillingQuota'
    ],
    medium: [
        'processOpBatch',
        'processContract',
        'processTransactionTrace',
        'processTransactionError',
        'reloadErc721Token',
        'processTokenTransfer',
        'reprocessWorkspaceTransactionTraces',
        'reprocessWorkspaceTransactionErrors',
        'processExplorerV2Dex',
        'processExplorerV2DexPair',
        'setupV2DexPoolReserves',
        'finalizePendingOrbitBatches',
        'checkOrbitMessageDeliveredLogs',
        'backfillOrbitMessageDeliveredLogs',
        'finalizePendingOpOutputs',
        'finalizePendingOpBatches',
        'linkOpDepositsToL2Txs',
        'checkOpDepositLogs'
    ],
    low: [
        'processUser',
        'enforceDataRetentionForWorkspace',
        'enrichProspect',
        'integrityCheckStarter',
        'integrityCheck',
        'processDetectedProspects',
        'rpcHealthCheck',
        'rpcHealthCheckStarter',
        'explorerSyncCheck',
        'workspaceReset',
        'batchBlockDelete',
        'batchContractDelete',
        'removeExpiredExplorers',
        'deleteWorkspace',
        'queueMonitoring',
        'queueCapSweep',
        'blockSyncMonitoring',
        'monitorOrbitBatches',
        'discoverOrbitBatches',
        'sendDiscordMessage',
        'backfillNativeTokenTransfers',
        'backfillOpBatchBlockRanges',
        'backfillOpDeposits',
        'backfillOpOutputs',
        'syncRecoveryCheck',
        'infraHealthCheck',
        'sendDemoExplorerLink',
        'sendDripEmail',
        'processDripEmails',
        'enrichDemoProfile',
        'processDetectedProspects',
        'enrichProspect'
    ]
};

const hostedOnlyNames = [
    'updateApproximatedRecord',
    'increaseStripeBillingQuota',
    'sendDemoExplorerLink',
    'sendDripEmail',
    'processDripEmails',
    'enrichDemoProfile'
];

const originalSelfHosted = process.env.SELF_HOSTED;

const loadPriorities = () => {
    let priorities;
    jest.isolateModules(() => {
        priorities = require('../../workers/priorities');
    });
    return priorities;
};

afterEach(() => {
    if (originalSelfHosted === undefined)
        delete process.env.SELF_HOSTED;
    else
        process.env.SELF_HOSTED = originalSelfHosted;
});

describe('priorities', () => {
    it('Should keep the exact hosted content', () => {
        delete process.env.SELF_HOSTED;
        expect(loadPriorities()).toEqual(hostedPriorities);
    });

    it('Should only expose the high, medium and low keys', () => {
        delete process.env.SELF_HOSTED;
        expect(Object.keys(loadPriorities())).toEqual(['high', 'medium', 'low']);
    });

    it('Should not register hosted-only queues on self-hosted instances', () => {
        process.env.SELF_HOSTED = 'true';
        const priorities = loadPriorities();
        const all = [...priorities.high, ...priorities.medium, ...priorities.low];

        for (const name of hostedOnlyNames)
            expect(all).not.toContain(name);

        expect(all.filter(name => name === 'processDetectedProspects')).toHaveLength(1);
        expect(all.filter(name => name === 'enrichProspect')).toHaveLength(1);
    });
});
