module.exports = {
    // High priority
    blockSync: require('./blockSync'),
    transactionSync: require('./transactionSync'),
    batchBlockSync: require('./batchBlockSync'),

    // Medium Priority
    contractProcessing: require('./contractProcessing'),
    transactionProcessing: require('./transactionProcessing'),
    processTokenTransfer: require('./processTokenTransfer'),
    reloadErc721Token: require('./reloadErc721Token'),
    reprocessAllTokenTransfers: require('./reprocessAllTokenTransfers'),

    // Low Priority
    submitExplorerLead: require('./submitExplorerLead'),
    processWorkspace: require('./processWorkspace'),
    processUser: require('./processUser'),
    enforceDataRetentionForWorkspace: require('./enforceDataRetentionForWorkspace')
};
