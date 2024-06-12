jest.mock('../../../lib/rpc', () => {
    const ethers = require('ethers');
    const actual = jest.requireActual('../../../lib/rpc');
    return {
        getBalanceChange: jest.fn(),
        getProvider: jest.fn(),    
        ContractConnector: jest.fn().mockImplementation(() => ({
            callReadMethod: jest.fn().mockResolvedValue([ethers.BigNumber.from('1')]),
            has721Interface: jest.fn().mockResolvedValue(false),
            has721Metadata: jest.fn().mockResolvedValue(true),
            has721Enumerable: jest.fn().mockResolvedValue(true),
            getBytecode: jest.fn().mockResolvedValue('0x1234')
        })),
        Tracer: actual.Tracer,
        RateLimiter: jest.fn().mockImplementation(() => ({
            limit: jest.fn(),
            wouldLimit: jest.fn()
        })),
        WalletConnector: jest.fn().mockImplementation(() => ({
            send: jest.fn().mockResolvedValue({ hash: '0x123' })
        })),
        ProviderConnector: jest.fn().mockImplementation(() => ({
            fetchRawBlockWithTransactions: jest.fn()
                .mockResolvedValue({
                    number: '0x1',
                    transactions: [
                        { hash: '0x123' },
                        { hash: '0x456' },
                        { hash: '0x789' }
                    ]
                }),
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
        })),
        ERC721Connector: jest.fn().mockImplementation(() => ({
            fetchAndStoreAllTokens: jest.fn().mockResolvedValue(true),
            tokenByIndex: jest.fn().mockResolvedValue('0'),
            ownerOf: jest.fn().mockResolvedValue('0xabc'),
            tokenURI: jest.fn().mockResolvedValue('http://metadata'),
            totalSupply: jest.fn().mockResolvedValue('1000'),
            symbol: jest.fn().mockResolvedValue('ETL'),
            name: jest.fn().mockResolvedValue('Ethernal')
        }))
    }
});
