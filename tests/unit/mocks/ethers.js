vi.mock('ethers', async () => {
    const actual = await vi.importActual('ethers');
    const provider = {
        send: (command) => {
            return new Promise((resolve) => {
                switch(command) {
                    case 'debug_traceTransaction':
                        resolve([{ trace: 'step' }]);
                        break;
                    case 'hardhat_impersonateAccount':
                        resolve(true);
                        break;
                    default:
                        resolve(true);
                        break;
                }
            });
        },
        listAccounts: vi.fn().mockResolvedValue(['0x123', '0x456']),
        getBalance: vi.fn().mockResolvedValue(1000),
        getBlockNumber: vi.fn().mockResolvedValue(1),
        getBlock: vi.fn().mockResolvedValue({ gasLimit: 1000 }),
        getSigner: vi.fn().mockReturnValue('0x123'),
        getTransaction: vi.fn().mockResolvedValue({ to: '0xabcd' })
    };
    const providers = {
        JsonRpcProvider: function() { return provider; },
        WebSocketProvider: function() { return provider; },
        Web3Provider: function() { return provider; }
    };
    const wallet = function() { return { address: '0x123' }; };
    let counter = 0;
    const contract = function() {
        return {
            name: () => 'Ethernal',
            symbol: () => 'ETL',
            decimals: () => 18,
            totalSupply: () => 1000,
            tokenByIndex: () => 1,
            ownerOf: () => '0x123',
            tokenURI: () => 'ipfs://QmPbxeGcXhYQQNgsC6a36dDyYUcHgMLnGKnF8pVFmGsvqi',
            functions: {
                name: () => ['Ethernal'],
                symbol: () => ['ETL'],
                decimals: () => [18],
                fakeRead: () => 'This is a fake result',
                totalSupply: () => [1000],
                'balanceOf(address)': vi.fn(() => ++counter % 2 ? [actual.BigNumber.from('2000000000000000')] : [actual.BigNumber.from('1000000000000000')])
            },
            fakeWrite: () => vi.fn().mockResolvedValue({ hash: '0x123abc' }),
            populateTransaction: {
                'build()': () => vi.fn().mockResolvedValue({ value: actual.BigNumber.from('1') })
            }
        };
    };

    return {
        default: vi.fn(),
        providers,
        Wallet: wallet,
        Contract: contract,
        utils: actual.utils,
        BigNumber: actual.BigNumber
    };
});