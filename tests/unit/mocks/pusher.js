jest.mock('../../../src/plugins/pusher', () => ({
    pusherPlugin: {
        install(Vue) {
            Vue.prototype.pusher = {
                onUpdatedAccount: jest.fn(),
                onNewFailedTransactions: jest.fn(),
                onNewProcessableTransactions: jest.fn(),
                onNewBlock: jest.fn(),
                onNewContract: jest.fn(),
                onNewTransaction: jest.fn(),
                onNewToken: jest.fn(),
                onUserUpdated: jest.fn(),
                onDestroyedContract: jest.fn()
            }
        }
    }
}));
