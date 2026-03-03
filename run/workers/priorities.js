const { isSelfHosted } = require('../lib/flags');

const priorities = {
    'high': [
        'blockSync',
        'processBlock',
        'batchBlockSync',
        'sendResetPasswordEmail',
        'updateExplorerSyncingProcess',
        'receiptSync',
        'finalizePendingOrbitBatches',
        'checkOrbitMessageDeliveredLogs',
        'backfillOrbitMessageDeliveredLogs',
        'storeOrbitDeposit',
        'finalizePendingOpOutputs',
        'finalizePendingOpBatches',
        'linkOpDepositsToL2Txs',
        'storeOpDeposit',
        'storeOpOutput',
        'checkOpDepositLogs',
        'startCustomL1ParentSync'
    ],
    'medium': [
        'processContract',
        'processTransactionTrace',
        'processTransactionError',
        'reloadErc721Token',
        'processTokenTransfer',
        'reprocessWorkspaceTransactionTraces',
        'reprocessWorkspaceTransactionErrors',
        'processExplorerV2Dex',
        'processExplorerV2DexPair',
        'setupV2DexPoolReserves'
    ],
    'low': [
        'processUser',
        'enforceDataRetentionForWorkspace',
        'integrityCheckStarter',
        'integrityCheck',
        'rpcHealthCheck',
        'rpcHealthCheckStarter',
        'explorerSyncCheck',
        'workspaceReset',
        'batchBlockDelete',
        'batchContractDelete',
        'removeExpiredExplorers',
        'deleteWorkspace',
        'removeStalledBlock',
        'queueMonitoring',
        'blockSyncMonitoring',
        'monitorOrbitBatches',
        'discoverOrbitBatches',
        'sendDiscordMessage',
        'backfillNativeTokenTransfers',
        'backfillOpBatchBlockRanges',
        'backfillOpDeposits',
        'backfillOpOutputs',
        'syncRecoveryCheck'
    ]
}

if (!isSelfHosted()) {
    priorities.high.push('updateApproximatedRecord', 'increaseStripeBillingQuota');
    priorities.low.push('sendDemoExplorerLink', 'sendDiscordMessage');
}

module.exports = priorities;
