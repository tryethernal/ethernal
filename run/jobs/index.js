module.exports = {
    // High priority
    blockSync: require('./blockSync'),
    batchBlockSync: require('./batchBlockSync'),
    sendResetPasswordEmail: require('./sendResetPasswordEmail'),
    updateExplorerSyncingProcess: require('./updateExplorerSyncingProcess'),
    updateApproximatedRecord: require('./updateApproximatedRecord'),
    receiptSync: require('./receiptSync'),
    removeStalledBlock: require('./removeStalledBlock'),
    increaseStripeBillingQuota: require('./increaseStripeBillingQuota'),

    // Medium Priority
    processContract: require('./processContract'),
    processTransactionTrace: require('./processTransactionTrace'),
    processTransactionError: require('./processTransactionError'),
    processTokenTransfer: require('./processTokenTransfer'),
    reloadErc721Token: require('./reloadErc721Token'),
    reprocessWorkspaceTransactionTraces: require('./reprocessWorkspaceTransactionTraces'),
    reprocessWorkspaceTransactionErrors: require('./reprocessWorkspaceTransactionErrors'),

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
    cancelDemoExplorers: require('./cancelDemoExplorers'),
    deleteWorkspace: require('./deleteWorkspace'),
    tokenTransferCleanup: require('./tokenTransferCleanup')
};
