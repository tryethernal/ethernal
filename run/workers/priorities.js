const { isSelfHosted } = require('../lib/flags');

const priorities = {
    'high': [
        'blockSync',
        'processBlock',
        'batchBlockSync',
        'sendResetPasswordEmail',
        'updateExplorerSyncingProcess',
        'receiptSync'
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
        'sendDiscordMessage'
    ]
}

if (!isSelfHosted()) {
    priorities.high.push('updateApproximatedRecord', 'increaseStripeBillingQuota');
    priorities.low.push('sendDemoExplorerLink', 'sendDiscordMessage');
}

module.exports = priorities;