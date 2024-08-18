jest.mock('`../../../src/lib/rpc', () => {
    const ethers = require('ethers');
    const actual = jest.requireActual('../../../src/lib/rpc');
    return {
        getProvider: jest.fn(),    
        ContractConnector: jest.fn(function() {
            return {
                callReadMethod: jest.fn().mockResolvedValue([ethers.BigNumber.from('1')]),
                has721Interface: jest.fn().mockResolvedValue(false),
                isErc20: jest.fn(),
                isErc721: jest.fn(),
                isErc1155: jest.fn(),
                isProxy: jest.fn(),
                decimals: jest.fn(),
                symbol: jest.fn(),
                name: jest.fn(),
                totalSupply: jest.fn(),
                getBytecode: jest.fn()
            }
        }),
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
            fetchTransactionReceipt: jest.fn().mockResolvedValue({ status: 1 })
        })),
        ERC721Connector: jest.fn().mockImplementation(() => ({
            tokenByIndex: jest.fn().mockResolvedValue('0'),
            ownerOf: jest.fn().mockResolvedValue('0xabc'),
            tokenURI: jest.fn().mockResolvedValue('http://metadata')
        })),
        ERC20Connector: jest.fn().mockImplementation(() => ({
            allowance: jest.fn().mockResolvedValue(true)
        })),
        V2DexRouterConnector: jest.fn()
    }
});
