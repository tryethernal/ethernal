module.exports = {
    // High priority
    blockSync: require('./blockSync'),
    transactionSync: require('./transactionSync'),
    batchBlockSync: require('./batchBlockSync'),
    batchInsertFirebasePasswordHashes: require('./batchInsertFirebasePasswordHashes'),
    insertFirebaseHashes: require('./insertFirebaseHashes'),
    sendResetPasswordEmail: require('./sendResetPasswordEmail'),

    // Medium Priority
    contractProcessing: require('./contractProcessing'),
    transactionProcessing: require('./transactionProcessing'),
    processTokenTransfer: require('./processTokenTransfer'),
    reloadErc721Token: require('./reloadErc721Token'),
    reprocessAllTokenTransfers: require('./reprocessAllTokenTransfers'),
    reprocessWorkspaceTransactions: require('./reprocessWorkspaceTransactions'),

    // Low Priority
    submitExplorerLead: require('./submitExplorerLead'),
    processWorkspace: require('./processWorkspace'),
    processUser: require('./processUser'),
    enforceDataRetentionForWorkspace: require('./enforceDataRetentionForWorkspace'),
    integrityCheckStarter: require('./integrityCheckStarter'),
    integrityCheck: require('./integrityCheck'),
    rpcHealthCheck: require('./rpcHealthCheck'),
    rpcHealthCheckStarter: require('./rpcHealthCheckStarter')
};
