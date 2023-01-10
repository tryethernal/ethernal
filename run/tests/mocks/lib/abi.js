jest.mock('../../../lib/abi', () => ({
    getTokenTransfer: jest.fn(),
    getTransactionMethodDetails: jest.fn()
}));
