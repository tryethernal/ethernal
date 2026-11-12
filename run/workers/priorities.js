const { isSelfHosted } = require('../lib/flags');
const hostedOnly = require('./hostedOnlyQueues');

const priorities = {
    'high': [
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
        'removeStalledBlock'
    ],
    'medium': [
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
    'low': [
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
        'infraHealthCheck'
    ]
}

if (!isSelfHosted()) {
    priorities.high.push(...hostedOnly.high);
    priorities.low.push(...hostedOnly.low, 'processDetectedProspects', 'enrichProspect');
}

module.exports = priorities;
