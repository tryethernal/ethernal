jest.mock('../../../src/plugins/pusher', () => ({
    pusherPlugin: {
        install(Vue) {
            Vue.prototype.pusher = {
                onNewFailedTransactions: jest.fn(),
                onNewProcessableTransactions: jest.fn(),
                onNewBlock: jest.fn(),
                onNewContract: jest.fn(),
                onNewTransaction: jest.fn(),
                onNewToken: jest.fn(),
                onUserUpdated: jest.fn()
            }
        }
    }
}));
