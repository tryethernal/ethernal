export const ethers = jest.mock('ethers', () => {
    const actual = jest.requireActual('ethers');
    const provider = {
        send: (command) => {
            return new Promise((resolve) => {
                switch(command) {
                    case 'debug_traceTransaction':
                        resolve([{ trace: 'step' }])
                        break;
                    case 'hardhat_impersonateAccount':
                        resolve(true);
                        break;
                    default:
                        resolve(true);
                        break;
                }
            })
        },
        listAccounts: () => {
            return new Promise((resolve) => {
                resolve(['0x123', '0x456']);
            })
        },
        getBalance: () => {
            return new Promise((resolve) => {
                resolve(1000);
            })
        },
        getBlockNumber: () => {
            return new Promise((resolve) => {
                resolve(1);
            })
        },
        getBlock: () => {
            return new Promise((resolve) => {
                resolve({ gasLimit: 1000 });
            })
        },
        getSigner: () => {
            return '0x123';
        },
        getTransaction: () => {
            return new Promise((resolve) => {
                resolve({ to: '0xabcd' })
            })
        }
    };
    const ethers = jest.fn(() => provider);
    const providers = {
        JsonRpcProvider: jest.fn(() => { return provider }),
        WebSocketProvider: jest.fn(() => { return provider }),
        Web3Provider: jest.fn(() => { return provider })
    };
    const wallet = function() { return { address: '0x123' }};
    const contract = function() {
        return {
            functions: {
                name: () => ['Ethernal'],
                symbol: () => ['ETL'],
                decimals: () => [18],
                fakeRead: () => 'This is a fake result'
            },
            fakeWrite: () => new Promise((resolve) => resolve({ hash: '0x123abc' })),
            populateTransaction: {
                'build()': () => new Promise((resolve) => resolve({ value: actual.BigNumber.from('1') }))
            }
        }
    };

    Object.defineProperty(ethers, 'providers', { value: providers, writable: false });
    Object.defineProperty(ethers, 'Wallet', { value: wallet, writable: false });
    Object.defineProperty(ethers, 'Contract', { value: contract, writable: false })
    Object.defineProperty(ethers, 'utils', { value: actual.utils, writable: false })

    return { ethers: ethers };
});
