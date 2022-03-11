const ethers = jest.mock('ethers', () => {
    const original = jest.requireActual('ethers');

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
                    case 'evm_unlockUnknownAccount':
                        resolve(false);
                        break;
                    default:
                        resolve(false);
                        break;
                }
            })
        }
    };
    const ethers = jest.fn(() => provider);
    const providers = {
        JsonRpcProvider: jest.fn(() => { return provider }),
        WebSocketProvider: jest.fn(() => { return provider })
    };

    const contract = function() {
        return {
            name: () => new Promise((resolve) => resolve('Ethernal')),
            symbol: () => new Promise((resolve) => resolve('ETL')),
            decimals: () => new Promise((resolve) => resolve(18)),
            functions: {
                name: () => new Promise((resolve) => resolve('Ethernal'))
            }
        }
    };

    Object.defineProperty(ethers, 'providers', { value: providers });
    Object.defineProperty(ethers, 'Contract', { value: contract });
    Object.defineProperty(ethers, 'BigNumber', { value: original.BigNumber });
    Object.defineProperty(ethers, 'utils', { value: original.utils });

    return ethers;
});

module.exports = {
    ethers: ethers
};