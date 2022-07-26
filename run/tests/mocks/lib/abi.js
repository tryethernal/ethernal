jest.mock('../../../lib/abi', () => ({
    getTokenTransfers: jest.fn(),
    getTransactionMethodDetails: jest.fn()
}));
