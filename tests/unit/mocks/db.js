jest.mock('../../../src/plugins/firebase', () => ({
    auth: jest.fn(),
    dbPlugin: {
        install(Vue) {
            Vue.prototype.db = {
                contractStorage: jest.fn(),
                getIdToken: jest.fn().mockResolvedValue('123')
            }
        }
    }
}));
