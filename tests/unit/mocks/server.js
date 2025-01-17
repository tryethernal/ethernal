export default {
    processFailedTransactions: vi.fn,
    getRpcAccounts: vi.fn(),
    getAccounts: vi.fn().mockResolvedValue({ data: { items: [] }}),
    getAccountBalance: vi.fn().mockResolvedValue('10000'),
    getContract: vi.fn().mockResolvedValue({ data: {} }),
    storeAccountPrivateKey: vi.fn().mockResolvedValue(),
    impersonateAccount: vi.fn(),
    getAddressTransactions: vi.fn().mockResolvedValue({ data: { items: [] }}),
    getBlock: vi.fn(),
    getBlocks: vi.fn(),
    callContractReadMethod: vi.fn(),
    getContracts: vi.fn(),
    createWorkspace: vi.fn(),
    initRpcServer: vi.fn().mockResolvedValue(),
    removeContract: vi.fn(),
    decodeData: vi.fn(),
    getStructure: vi.fn(),
    processContracts: vi.fn(),
    getProcessableTransactions: vi.fn().mockResolvedValue({ data: [] }),
    getFailedProcessableTransactions: vi.fn().mockResolvedValue({ data: [] }),
    processTransactions: vi.fn().mockResolvedValue(),
    processFailedTransactions: vi.fn().mockResolvedValue(),
    getWorkspaces: vi.fn().mockResolvedValue({ data: [] }),
    updateWorkspaceSettings: vi.fn().mockResolvedValue(),
    getTransaction: vi.fn().mockResolvedValue(),
    getTransactions: vi.fn(),
    getTokenBalances: vi.fn(),
    getTransactions: vi.fn(),
    getTransactionVolume: vi.fn(),
    getErc721Tokens: vi.fn(),
    getErc721TokenTransfers: vi.fn(),
    getErc721Token: vi.fn(),
    reloadErc721Token: vi.fn(),
    transferErc721Token: vi.fn(),
    getApiToken: vi.fn(),
    setCurrentWorkspace: vi.fn().mockResolvedValue(null),
    getAddressStats: vi.fn(),
    getContractStats: vi.fn(),
    getTokenTransferVolume: vi.fn(),
    getTokenHolderHistory: vi.fn(),
    signIn: vi.fn(),
    signUp: vi.fn(),
    sendResetPasswordEmail: vi.fn(),
    resetPassword: vi.fn(),
    getExplorerStatus: vi.fn(),
    getCompilerVersions: vi.fn(),
    getExplorer: vi.fn(),
    getExplorerPlans: vi.fn(),
    createExplorer: vi.fn(),
    startCryptoSubscription: vi.fn(),
    createStripeExplorerCheckoutSession: vi.fn(),
    createStripeExplorerCheckoutSession: vi.fn(),
    getExplorerDomainStatus: vi.fn(),
    updateExplorerSettings: vi.fn(),
    getExplorers: vi.fn(),
    searchIcon: vi.fn(),
    updateExplorerSubscription: vi.fn(),
    cancelExplorerSubscription: vi.fn(),
    getExplorerSyncStatus: vi.fn(),
    stopExplorerSync: vi.fn(),
    startExplorerSync: vi.fn(),
    migrateDemoExplorer: vi.fn(),
    startTrial: vi.fn(),
    getCurrentUser: vi.fn(),
    getTokenCirculatingSupply: vi.fn(),
    getAverageGasPrice: vi.fn(),
    getAverageTransactionFee: vi.fn(),
    getUniqueWalletCount: vi.fn(),
    getCumulativeWalletCount: vi.fn(),
    getDeployedContractCount: vi.fn(),
    getCumulativeDeployedContractCount: vi.fn(),
    getTransactionLogs: vi.fn(),
    getQuotaExtensionPlan: vi.fn(),
    cancelQuotaExtension: vi.fn(),
    updateQuotaExtension: vi.fn(),
    getErc721TotalSupply: vi.fn(),
    getErc721TokenById: vi.fn(),
    getErc721TokenByIndex: vi.fn(),
    getExplorerBilling: vi.fn(),
    getFaucetBalance: vi.fn(),
    getFaucetRequestVolume: vi.fn(),
    getFaucetTokenVolume: vi.fn(),
    getFaucetPrivateKey: vi.fn(),
    getFaucetTransactionHistory: vi.fn(),
    getV2DexTokens: vi.fn(),
    getNativeTokenBalance: vi.fn(),
    getV2DexQuote: vi.fn(),
    getV2DexStatus: vi.fn(),
    getActiveWalletCount: vi.fn(),
    getTxCountTotal: vi.fn(),
    getTxCount24h: vi.fn(),

    syncTransactionData: function() {
        return new Promise((resolve) => resolve(true))
    },

    resetWorkspace: function() {
        return new Promise((resolve) => resolve(true));
    },

    importContract: function() {
        return new Promise((resolve) => resolve({ data: { success: true, contractIsVerified: true }}));
    },

    syncContractData: () => {
        return new Promise((resolve) => resolve(true));
    },

    searchForLocalChains: () => {
        return new Promise((resolve) => resolve(['http://127.0.0.1:8545']));
    },

    getAccount: () => {
        return new Promise((resolve) => resolve({ data: { address: '0x1234', privateKey: null }}));
    },

    callContractWriteMethod: vi.fn(() => {
        const pendingTx = {
            hash: '0xabcd',
            wait: () => new Promise((resolve) => resolve({ status: true }))
        }

        return new Promise((resolve) => resolve(pendingTx));
    }),

    enableWorkspaceApi: () => {
        return new Promise((resolve) => resolve({ data: { token: '123456abcdef' }}));
    },

    disableWorkspaceApi: () => {
        return new Promise((resolve) => resolve({ success: true }));
    },

    getWorkspaceApiToken: () => {
        return new Promise((resolve) => resolve({ data: { token: '123456abcdef' }}));
    },

    enableAlchemyWebhook: () => {
        return new Promise((resolve) => resolve({ data: { token: '123456abcdef' }}));
    },

    disableAlchemyWebhook: () => {
        return new Promise((resolve) => resolve({ success: true }));
    },

    syncBalance: () => {
        return new Promise((resolve) => resolve({ success: true }));
    }
};