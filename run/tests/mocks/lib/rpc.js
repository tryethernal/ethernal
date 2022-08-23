jest.mock('../../../lib/rpc', () => {
    const ethers = require('ethers');
    const actual = jest.requireActual('../../../lib/rpc');
    return {
        getProvider: jest.fn(),    
        ContractConnector: jest.fn().mockImplementation(() => ({
            callReadMethod: jest.fn()
                .mockResolvedValue([ethers.BigNumber.from('1')])
        })),
        Tracer: actual.Tracer,
        ProviderConnector: jest.fn().mockImplementation(() => ({
            fetchNetworkId: jest.fn().mockResolvedValue(123),
            fetchBlockWithTransactions: jest.fn()
                .mockResolvedValue({
                    number: 1,
                    transactions: [
                        { hash: '0x123' },
                        { hash: '0x456' },
                        { hash: '0x789' }
                    ]
                }),
            fetchTransactionReceipt: jest.fn()
                .mockResolvedValue({
                    status: 1
                })
        }))
    }
});
