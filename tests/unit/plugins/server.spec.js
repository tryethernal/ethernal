jest.mock('@truffle/decoder', () => ({
    forArtifactAt: () => {
        return new Promise((resolve) => resolve(true));
    }
}));
jest.mock('@/lib/storage', () => {
    const Storage = require('../fixtures/Storage');
    const DecodedData = require('../fixtures/DecodedStorageData');
    const storage = jest.fn(() => {
        return {
            buildStructure: () => { return new Promise((resolve) => resolve(true)) },
            watch: () => { return new Promise((resolve) => resolve(true)) },
            toJSON: () => { return Storage },
            decodeData: () => { return DecodedData }
        }
    });
    return { Storage: storage };
});

jest.mock('web3', () => {
    const provider = {
        eth: {
            net: {
                getId: jest.fn(() => { return new Promise((resolve) => resolve(1)) })
            }
        },
    };
    const web3 = jest.fn(() => provider);
    const providers = {
        HttpProvider: jest.fn(() => { return provider }),
        WebsocketProvider: jest.fn(() => { return provider })
    };
    Object.defineProperty(web3, 'providers', { value: providers, writable: false })
    return web3;
});
jest.mock('@/lib/trace', () => ({
    parseTrace: () => {
        return new Promise((resolve) => {
            resolve([{ trace: 'step' }]);
        });
    }
}))
jest.mock('@/plugins/firebase', () => {
    const syncTokenBalanceChangesFunction = jest.fn();
    const httpsCallable = (fn) => {
        switch(fn) {
            case 'syncTokenBalanceChanges':
                return syncTokenBalanceChangesFunction;
                break;
            case 'getUnprocessedContracts':
                return jest.fn(() => ({
                    data: {
                        contracts: [
                            { address: '0x123' }
                        ]
                    }
                }));
                break;
            case 'setTokenProperties':
                return jest.fn(() => ({
                    data: {
                        success: true
                    }
                }));
                break;
            default:
                return jest.fn(() => ({ data: {}}));
        }
    }
    return {
        ...jest.requireActual('@/plugins/firebase'),
        functions: { httpsCallable: httpsCallable }
    };
});

import { ethers } from '../mocks/ethers';

import MockHelper from '../MockHelper';
import { functions } from '@/plugins/firebase';

describe('server', () => {
    let helper, server;

    beforeEach(() => {
        helper = new MockHelper({ currentWorkspace: { rpcServer: 'http://localhost:8545' }}, true, false);
        const wrapper = helper.mountFn({});
        server = wrapper.vm.server;
    });

    it('Should fetch balance changes & sync them', async (done) => {
        const transaction = {
            hash: '0x123',
            blockNumber: '2',
            tokenTransfers: [
                {
                    token: '0xdc64a140aa3e981100a9beca4e685f962f0cf6c9',
                    src: '0x5e03a5a4784bbd887aff75dc6eef78f4a41d76d1',
                    dst: '0x0000000000000000000000000000000000000000',
                    amount: '1000'
                }
            ]
        };

        await server.processTransactions({ name: 'Hardhat', rpcServer: 'http://localhost:8545' }, [transaction]);
        expect(functions.httpsCallable('syncTokenBalanceChanges')).toHaveBeenCalledWith({
            workspace: 'Hardhat',
            transaction: '0x123',
            tokenBalanceChanges: {
                '0xdc64a140aa3e981100a9beca4e685f962f0cf6c9': [
                    {
                        address: '0x5e03a5a4784bbd887aff75dc6eef78f4a41d76d1',
                        currentBalance: '2000000000000000',
                        previousBalance: '1000000000000000',
                        diff: '1000000000000000'
                    }
                ]
            }
        });
        done();
    });

    it('Should process and update the contracts', async (done) => {
        const result = await server.processContracts('Hardhat');
        expect(result).toEqual(true);
        done();
    });

    it('Should return local chains', async (done) => {
        const chains = await server.searchForLocalChains();
        expect(chains).toEqual([
            'http://127.0.0.1:7545',
            'http://127.0.0.1:8545',
            'http://127.0.0.1:9545',
            'ws://127.0.0.1:7545',
            'ws://127.0.0.1:8545',
            'ws://127.0.0.1:9545'
        ]);
        done();
    });

    it('Should impersonate an account', async (done) => {
        const success = await server.impersonateAccount('http://localhost:8545', '0x123');
        expect(success).toBe(true);
        done();
    });

    it('Should return available accounts', async (done) => {
        const accounts = await server.getAccounts();
        expect(accounts).toEqual(['0x123', '0x456']);
        done();
    });

    it('Should return the balance of the account', async (done) => {
        const balance = await server.getAccountBalance('0x123');
        expect(balance).toBe(1000);
        done();
    });

    it('Should return workspace data', async (done) => {
        const workspace = await server.initRpcServer('http://localhost:8545', true);
        expect(workspace).toEqual({
            rpcServer: 'http://localhost:8545',
            networkId: 1,
            settings: {
                gasLimit: '1000'
            }
        });
        done();
    });

    it('Should call the read method without signing', async (done) => {
        const options = {
            gasLimit: 10000,
            gasPrice: 1
        };
        const contract = {
            address: '0xabcd',
            abi: {}
        };
        const result = await server.callContractReadMethod(
            contract,
            'fakeRead',
            options,
            'a parameter',
            'http://localhost:8545'
        );
        expect(result).toBe('This is a fake result');
        done();
    });

    it('Should call the read method with signing', async (done) => {
        const options = {
            gasLimit: 10000,
            gasPrice: 1,
            pkey: '0x123abc'
        };
        const contract = {
            address: '0xabcd',
            abi: {}
        };

        const result = await server.callContractReadMethod(
            contract,
            'fakeRead',
            options,
            'a parameter',
            'http://localhost:8545'
        );
        expect(result).toBe('This is a fake result');
        done();
    });

   it('Should call the write method without signing', async (done) => {
        const options = {
            gasLimit: 10000,
            gasPrice: 1,
            value: 1
        };
        const contract = {
            address: '0xabcd',
            abi: {}
        };

        const result = await server.callContractWriteMethod(
            contract,
            'fakeWrite',
            options,
            'a parameter',
            'http://localhost:8545',
            false
        );
        expect(result).toEqual({
            pendingTx: {
                hash: '0x123abc'
            }
        });
        done();
    });

   it('Should call the write method with signing', async (done) => {
        const options = {
            gasLimit: 10000,
            gasPrice: 1,
            value: 1,
            pkey: '0x123abc'
        };
        const contract = {
            address: '0xabcd',
            abi: {}
        };

        const result = await server.callContractWriteMethod(
            contract,
            'fakeWrite',
            options,
            'a parameter',
            'http://localhost:8545',
            false
        );
        expect(result).toEqual({
            pendingTx: {
                hash: '0x123abc'
            }
        });
        done();
    });

   it('Should call the write method with tracing', async (done) => {
        const options = {
            gasLimit: 10000,
            gasPrice: 1,
            value: 1,
            pkey: '0x123abc'
        };
        const contract = {
            address: '0xabcd',
            abi: {}
        };

        const result = await server.callContractWriteMethod(
            contract,
            'fakeWrite',
            options,
            'a parameter',
            'http://localhost:8545',
            true
        );
        expect(result).toEqual({
            pendingTx: {
                hash: '0x123abc'
            },
            trace: [{ trace: 'step' }]
        });
        done();
    });

   it('Should return the contract data structure', async (done) => {
        const StorageFixture = require('../fixtures/Storage');
        const contract = {
            address: '0xabcd',
            abi: {},
            artifact: '{}'
        };
        const dependenciesArtifact = {}

        const result = await server.getStructure(contract, 'http://localhost:8545', dependenciesArtifact);
        expect(result).toEqual(StorageFixture);
        done();
   });

   it('Should return decoded data', async (done) => {
       const DecodedDataFixture = require('../fixtures/DecodedStorageData');
       const contract = {
            address: '0xabcd',
            abi: {},
            artifact: '{}'
        };
        const result = await server.decodeData(contract, 'http://localhost:8545', 123);
        expect(result).toEqual(DecodedDataFixture);
        done();
   })

    afterEach(async () => {
        await helper.clearFirebase();
    });
});
