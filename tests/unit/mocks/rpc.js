vi.mock('@/lib/rpc', async () => {
    const ethers = require('ethers');
    const actual = await vi.importActual('@/lib/rpc');
    return {
        getProvider: vi.fn(),
        ContractConnector: vi.fn(function() {
            return {
                callReadMethod: vi.fn().mockResolvedValue([ethers.BigNumber.from('1')]),
                has721Interface: vi.fn().mockResolvedValue(false),
                isErc20: vi.fn(),
                isErc721: vi.fn(),
                isErc1155: vi.fn(),
                isProxy: vi.fn(),
                decimals: vi.fn(),
                symbol: vi.fn(),
                name: vi.fn(),
                totalSupply: vi.fn(),
                getBytecode: vi.fn()
            }
        }),
        Tracer: actual.Tracer,
        ProviderConnector: vi.fn().mockImplementation(() => ({
            fetchNetworkId: vi.fn().mockResolvedValue(123),
            fetchBlockWithTransactions: vi.fn()
                .mockResolvedValue({
                    number: 1,
                    transactions: [
                        { hash: '0x123' },
                        { hash: '0x456' },
                        { hash: '0x789' }
                    ]
                }),
            fetchTransactionReceipt: vi.fn().mockResolvedValue({ status: 1 })
        })),
        ERC721Connector: vi.fn().mockImplementation(() => ({
            tokenByIndex: vi.fn().mockResolvedValue('0'),
            ownerOf: vi.fn().mockResolvedValue('0xabc'),
            tokenURI: vi.fn().mockResolvedValue('http://metadata')
        })),
        ERC20Connector: vi.fn().mockImplementation(() => ({
            allowance: vi.fn().mockResolvedValue(true)
        })),
        V2DexRouterConnector: vi.fn()
    }
});
