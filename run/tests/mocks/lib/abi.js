jest.mock('../../../lib/abi', () => ({
    getV2PoolReserves: jest.fn().mockReturnValue({ reserve0: '10000', reserve1: '20000' }),
    getTokenTransfer: jest.fn(),
    getTransactionMethodDetails: jest.fn()
}));
