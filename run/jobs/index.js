
module.exports = {
    // High priority
    blockSync: require('./blockSync'),
    processBlock: require('./processBlock'),
    batchBlockSync: require('./batchBlockSync'),
    sendResetPasswordEmail: require('./sendResetPasswordEmail'),
    updateExplorerSyncingProcess: require('./updateExplorerSyncingProcess'),
    updateApproximatedRecord: require('./updateApproximatedRecord'),
    receiptSync: require('./receiptSync'),
    removeStalledBlock: require('./removeStalledBlock'),
    increaseStripeBillingQuota: require('./increaseStripeBillingQuota'),
    deleteDuplicateBalanceChangeForWorkspace: require('./deleteDuplicateBalanceChangeForWorkspace'),

    // Medium Priority
    processContract: require('./processContract'),
    processTransactionTrace: require('./processTransactionTrace'),
    processTransactionError: require('./processTransactionError'),
    processTokenTransfer: require('./processTokenTransfer'),
    reloadErc721Token: require('./reloadErc721Token'),
    reprocessWorkspaceTransactionTraces: require('./reprocessWorkspaceTransactionTraces'),
    reprocessWorkspaceTransactionErrors: require('./reprocessWorkspaceTransactionErrors'),
    processExplorerV2Dex: require('./processExplorerV2Dex'),
    processExplorerV2DexPair: require('./processExplorerV2DexPair'),
    setupV2DexPoolReserves: require('./setupV2DexPoolReserves'),

    // Low Priority
    processUser: require('./processUser'),
    enforceDataRetentionForWorkspace: require('./enforceDataRetentionForWorkspace'),
    integrityCheckStarter: require('./integrityCheckStarter'),
    integrityCheck: require('./integrityCheck'),
    rpcHealthCheck: require('./rpcHealthCheck'),
    rpcHealthCheckStarter: require('./rpcHealthCheckStarter'),
    explorerSyncCheck: require('./explorerSyncCheck'),
    workspaceReset: require('./workspaceReset'),
    batchBlockDelete: require('./batchBlockDelete'),
    batchContractDelete: require('./batchContractDelete'),
    removeExpiredExplorers: require('./removeExpiredExplorers'),
    deleteWorkspace: require('./deleteWorkspace'),
    tokenTransferCleanup: require('./tokenTransferCleanup'),
    queueMonitoring: require('./queueMonitoring'),
    blockSyncMonitoring: require('./blockSyncMonitoring')
};
