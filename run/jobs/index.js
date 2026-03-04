/**
 * @fileoverview Job handler exports.
 * Aggregates all background job handlers organized by priority level.
 * @module jobs
 */

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
    finalizePendingOrbitBatches: require('./finalizePendingOrbitBatches'),
    checkOrbitMessageDeliveredLogs: require('./checkOrbitMessageDeliveredLogs'),
    backfillOrbitMessageDeliveredLogs: require('./backfillOrbitMessageDeliveredLogs'),
    storeOrbitDeposit: require('./storeOrbitDeposit'),
    finalizePendingOpOutputs: require('./finalizePendingOpOutputs'),
    finalizePendingOpBatches: require('./finalizePendingOpBatches'),
    linkOpDepositsToL2Txs: require('./linkOpDepositsToL2Txs'),
    storeOpDeposit: require('./storeOpDeposit'),
    storeOpOutput: require('./storeOpOutput'),
    checkOpDepositLogs: require('./checkOpDepositLogs'),
    checkCustomL1ParentSync: require('./checkCustomL1ParentSync'),
    startCustomL1ParentSync: require('./startCustomL1ParentSync'),

    // Medium Priority
    processOpBatch: require('./processOpBatch'),
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
    syncRecoveryCheck: require('./syncRecoveryCheck'),
    workspaceReset: require('./workspaceReset'),
    batchBlockDelete: require('./batchBlockDelete'),
    batchContractDelete: require('./batchContractDelete'),
    removeExpiredExplorers: require('./removeExpiredExplorers'),
    deleteWorkspace: require('./deleteWorkspace'),
    queueMonitoring: require('./queueMonitoring'),
    blockSyncMonitoring: require('./blockSyncMonitoring'),
    sendDiscordMessage: require('./sendDiscordMessage'),
    sendDemoExplorerLink: require('./sendDemoExplorerLink'),
    backfillNativeTokenTransfers: require('./backfillNativeTokenTransfers'),
    backfillOpBatchBlockRanges: require('./backfillOpBatchBlockRanges'),
    backfillOpDeposits: require('./backfillOpDeposits'),
    backfillOpOutputs: require('./backfillOpOutputs')
};
