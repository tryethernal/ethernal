jest.mock('@/plugins/server', () => ({
    serverPlugin: {
        install(Vue) {
            Vue.prototype.server = {
                processFailedTransactions: jest.fn,
                getRpcAccounts: jest.fn(),
                getAccounts: jest.fn().mockResolvedValue({ data: { items: [] }}),
                getAccountBalance: jest.fn().mockResolvedValue('10000'),
                getContract: jest.fn().mockResolvedValue({ data: {} }),
                storeAccountPrivateKey: jest.fn().mockResolvedValue(),
                impersonateAccount: jest.fn(),
                getAddressTransactions: jest.fn().mockResolvedValue({ data: { items: [] }}),
                getBlock: jest.fn(),
                getBlocks: jest.fn(),
                callContractReadMethod: jest.fn(),
                getContracts: jest.fn(),
                createWorkspace: jest.fn(),
                initRpcServer: jest.fn().mockResolvedValue(),
                removeContract: jest.fn(),
                decodeData: jest.fn(),
                getStructure: jest.fn(),
                processContracts: jest.fn(),
                getProcessableTransactions: jest.fn().mockResolvedValue({ data: [] }),
                getFailedProcessableTransactions: jest.fn().mockResolvedValue({ data: [] }),
                processTransactions: jest.fn().mockResolvedValue(),
                processFailedTransactions: jest.fn().mockResolvedValue(),
                getWorkspaces: jest.fn().mockResolvedValue({ data: [] }),
                updateWorkspaceSettings: jest.fn().mockResolvedValue(),
                getTransaction: jest.fn().mockResolvedValue(),
                getTransactions: jest.fn(),
                getTokenBalances: jest.fn(),
                getGlobalStats: jest.fn(),
                getTransactions: jest.fn(),
                getTransactionVolume: jest.fn(),
                getErc721Tokens: jest.fn(),
                getErc721TokenTransfers: jest.fn(),
                getErc721Token: jest.fn(),
                reloadErc721Token: jest.fn(),
                transferErc721Token: jest.fn(),
                getApiToken: jest.fn(),
                setCurrentWorkspace: jest.fn().mockResolvedValue(null),
                getAddressStats: jest.fn(),
                getContractStats: jest.fn(),
                getTokenTransferVolume: jest.fn(),
                getTokenCumulativeSupply: jest.fn(),
                getTokenHolderHistory: jest.fn(),
                signIn: jest.fn(),
                signUp: jest.fn(),
                sendResetPasswordEmail: jest.fn(),
                resetPassword: jest.fn(),
                getExplorerStatus: jest.fn(),
                getCompilerVersions: jest.fn(),
                getExplorer: jest.fn(),
                getExplorerPlans: jest.fn(),
                createExplorer: jest.fn(),
                startCryptoSubscription: jest.fn(),
                createStripeExplorerCheckoutSession: jest.fn(),
                createStripeExplorerCheckoutSession: jest.fn(),
                getExplorerDomainStatus: jest.fn(),
                updateExplorerSettings: jest.fn(),
                getExplorers: jest.fn(),
                searchIcon: jest.fn(),
                updateExplorerSubscription: jest.fn(),
                cancelExplorerSubscription: jest.fn(),
                getExplorerSyncStatus: jest.fn(),
                stopExplorerSync: jest.fn(),
                startExplorerSync: jest.fn(),
                migrateDemoExplorer: jest.fn(),
                startTrial: jest.fn(),
                getCurrentUser: jest.fn(),
                getTokenCirculatingSupply: jest.fn(),
                getAverageGasPrice: jest.fn(),
                getAverageTransactionFee: jest.fn(),
                getUniqueWalletCount: jest.fn(),
                getCumulativeWalletCount: jest.fn(),
                getDeployedContractCount: jest.fn(),
                getCumulativeDeployedContractCount: jest.fn(),
                getTransactionLogs: jest.fn(),
                getQuotaExtensionPlan: jest.fn(),
                cancelQuotaExtension: jest.fn(),
                updateQuotaExtension: jest.fn(),
                getErc721TotalSupply: jest.fn(),
                getErc721TokenById: jest.fn(),
                getErc721TokenByIndex: jest.fn(),
                getExplorerBilling: jest.fn(),

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

                searchForLocalChains: () => {
                    return new Promise((resolve) => resolve(['http://127.0.0.1:8545']));
                },

                getAccount: () => {
                    return new Promise((resolve) => resolve({ data: { address: '0x1234', privateKey: null }}));
                },

                callContractWriteMethod: jest.fn(() => {
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
            }
        }
    }
}));
