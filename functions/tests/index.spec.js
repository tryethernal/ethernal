jest.mock('ethers', () => {
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

    Object.defineProperty(ethers, 'providers', { value: providers });
    Object.defineProperty(ethers, 'BigNumber', { value: original.BigNumber });

    return ethers;
});
const ethers = require('ethers');
jest.mock('axios', () => ({
    get: jest.fn()
}));
const axios = require('axios');
const index = require('../index');
const Helper = require('./helper');
const Trace = require('./fixtures/ProcessedTrace.json');
const Transaction = require('./fixtures/Transaction.json');
const TransactionReceipt = require('./fixtures/TransactionReceipt.json');
const ABI = require('./fixtures/ABI.json');
const Block = require('./fixtures/Block.json');
let auth = { auth: { uid: '123' }};
let helper;

describe('resetWorkspace', () => {
    beforeEach(() => {
        helper = new Helper(process.env.GCLOUD_PROJECT)
    });

    it('Should remove accounts/blocks/contracts/transactions from firestore', async () => {
        await helper.workspace.collection('accounts').doc('0x123').set({ address: '0x123' });
        await helper.workspace.collection('blocks').doc('0xabc').set({ number: '1' });
        await helper.workspace.collection('contracts').doc('0x456').set({ address: '0x456' });
        await helper.workspace.collection('transactions').doc('0x789').set({ hash: '0x789' });
        await helper.database.ref('/users/123/workspaces/hardhat/contracts/0x123').set({ a: 3});

        const wrapped = helper.test.wrap(index.resetWorkspace);
        const result = await wrapped({ workspace: 'hardhat' }, auth);
        
        const accountsSnap = await helper.workspace.collection('accounts').get();
        const blocksSnap = await helper.workspace.collection('blocks').get();
        const contractsSnap = await helper.workspace.collection('contracts').get();
        const transactionsSnap = await helper.workspace.collection('transactions').get();
        const contractDbSnap = await helper.database.ref('/users/123/workspaces/hardhat/contracts/0x123').once('value');

        expect(accountsSnap.size).toBe(0);
        expect(blocksSnap.size).toBe(0);
        expect(contractsSnap.size).toBe(0);
        expect(transactionsSnap.size).toBe(0);
        expect(contractDbSnap.val()).toBe(null);
    });

    afterEach(async () => {
        await helper.clean();
    })
});

describe('syncBlock', () => {
    beforeEach(() => {
        helper = new Helper(process.env.GCLOUD_PROJECT);
    });

    it('Should sanitize and return the synced block number', async () => {
        const wrapped = helper.test.wrap(index.syncBlock);
        const block = {
            number: '123',
            value: null
        };
        
        const result = await wrapped({ block: block, workspace: 'hardhat' }, auth);

        const blockRef = await helper.workspace.collection('blocks').doc('123').get();
        
        expect(blockRef.data()).toEqual({ number: '123' });
        expect(result).toEqual({ blockNumber: '123' });
    });

    afterEach(async () => {
        await helper.clean();
    });
});

describe('syncContractArtifact', () => {
    let contractArtifact;

    beforeEach(() => {
        helper = new Helper(process.env.GCLOUD_PROJECT);
        const AmalfiContract = require('./fixtures/AmalfiContract.json');
        contractArtifact = JSON.stringify(AmalfiContract.artifact);
    });

    it('Should store the contract artifact in rtdb', async () => {
        const wrapped = helper.test.wrap(index.syncContractArtifact);
        const data = {
            workspace: 'hardhat',
            address: '0x123',
            artifact: contractArtifact
        };

        const result = await wrapped(data, auth);

        const artifactRef = await helper.database.ref('/users/123/workspaces/hardhat/contracts/0x123/artifact').once('value');

        expect(artifactRef.val()).toEqual(contractArtifact);
        expect(result).toEqual({ address: '0x123' });
    });

    afterEach(async () => {
        await helper.clean();
    });
});

describe('syncContractDependencies', () => {
    let contractArtifact;

    beforeEach(() => {
        helper = new Helper(process.env.GCLOUD_PROJECT);
        const AmalfiContract = require('./fixtures/AmalfiContract.json');
        contractDependency = JSON.stringify(AmalfiContract.dependencies['Address']);
    });

    it('Should store the contract dependencies in the database', async () => {
        const wrapped = helper.test.wrap(index.syncContractDependencies);
        const data = {
            workspace: 'hardhat',
            address: '0x123',
            dependencies: { Address: contractDependency }
        };

        const result = await wrapped(data, auth);

        const artifactRef = await helper.database.ref('/users/123/workspaces/hardhat/contracts/0x123/dependencies').once('value');

        expect(artifactRef.val()).toEqual({ Address: contractDependency });
        expect(result).toEqual({ address: '0x123' });
    });

    afterEach(async () => {
        await helper.clean();
    });
});

describe('syncTrace', () => {
    const firestoreConverter = async (snapshot, options) => {
        const data = snapshot.data(options);
        let res = { trace: [] };
        for (let step of data.trace) {
            const contract = (await step.contract.get()).data();
            res.trace.push({
                address: step.address,
                hashedBytecode: step.hashedBytecode,
                id: step.id,
                input: step.input,
                contract: contract,
                op: step.op
            })
        }
        return JSON.parse(JSON.stringify(res));
    };

    beforeEach(async () => {
        helper = new Helper(process.env.GCLOUD_PROJECT);
    });

    it('Should store a filtered trace', async () => {
        const wrapped = helper.test.wrap(index.syncTrace);

        const data = {
            workspace: 'hardhat',
            txHash: '0x123',
            steps: Trace
        };

        const result = await wrapped(data, auth);
        const txRef = await helper.workspace
            .collection('transactions')
            .doc('0x123')
            .withConverter({ fromFirestore: firestoreConverter })
            .get();
        
        const tx = await txRef.data();
        expect(tx).toMatchSnapshot();
        expect(result).toEqual({ success: true });
    });

    it('Should match with a local contract if the called address is found', async () => {
        const wrapped = helper.test.wrap(index.syncTrace);

        await helper.workspace
            .collection('contracts')
            .doc('0x9ca4da328f8f337ffba3ebf39ef40f77df74e9c8')
            .set({
                address: '0x9ca4da328f8f337ffba3ebf39ef40f77df74e9c8',
                abi: { my: 'function' }
            });

        const data = {
            workspace: 'hardhat',
            txHash: '0x123',
            steps: [Trace[1]]
        };

        const result = await wrapped(data, auth);
        const txRef = await helper.workspace
            .collection('transactions')
            .doc('0x123')
            .withConverter({ fromFirestore: firestoreConverter })
            .get();

        const tx = await txRef.data();
        expect(tx).toMatchSnapshot();
        expect(result).toEqual({ success: true });
    });

    afterEach(async () => {
        await helper.clean();
    });
});

describe('syncContractData', () => {
    beforeEach(async () => {
        helper = new Helper(process.env.GCLOUD_PROJECT);
    });

    it('Should store contract data', async () => {
        const wrapped = helper.test.wrap(index.syncContractData);

        const data = {
            workspace: 'hardhat',
            address: '0x123',
            name: 'Contract',
            abi: { my: 'function' }
        };

        const result = await wrapped(data, auth);

        const contractRef = await helper.workspace
            .collection('contracts')
            .doc('0x123')
            .get();

        const tx = await contractRef.data();
        expect(tx).toMatchSnapshot();
        expect(result).toEqual({ address: '0x123' });
    });

    afterEach(async () => {
        await helper.clean();
    });
});

describe('syncTransaction', () => {
    beforeEach(async () => {
        helper = new Helper(process.env.GCLOUD_PROJECT);
    });

    it('Should store the transaction and return the hash', async () => {
        const wrapped = helper.test.wrap(index.syncTransaction);

        const data = {
            workspace: 'hardhat',
            transaction: Transaction,
            block: Block
        };

        const result = await wrapped(data, auth);
        const txRef = await helper.workspace
            .collection('transactions')
            .doc(Transaction.hash)
            .get();
        const tx = await txRef.data();
        expect(tx).toMatchSnapshot();
        expect(result).toEqual({ txHash: Transaction.hash });
    });

    it('Should store the transaction & receipt, decode function signature, and return the hash', async () => {
        const wrapped = helper.test.wrap(index.syncTransaction);

        const data = {
            workspace: 'hardhat',
            transaction: Transaction,
            transactionReceipt: TransactionReceipt,
            block: Block
        };

        await helper.workspace.collection('contracts').doc(Transaction.to).set({
            address: Transaction.to,
            abi: ABI
        });
        
        const result = await wrapped(data, auth);
        const txRef = await helper.workspace
            .collection('transactions')
            .doc(Transaction.hash)
            .get();
        const tx = await txRef.data();
        expect(tx).toMatchSnapshot();
        expect(result).toEqual({ txHash: Transaction.hash });
    });

    it('Should create the contract locally if there no to field', async () => {
        const wrapped = helper.test.wrap(index.syncTransaction);

        const { to, ...creationTransaction } = Transaction;

        const data = {
            workspace: 'hardhat',
            transaction: creationTransaction,
            transactionReceipt: { ...TransactionReceipt, contractAddress: to },
            block: Block
        };

        const result = await wrapped(data, auth);

        const contractRef = await helper.workspace
            .collection('contracts')
            .doc(to)
            .get();
        const contract = await contractRef.data();
        expect(contract).toMatchSnapshot();
        expect(result).toEqual({ txHash: Transaction.hash });
    });

    afterEach(async () => {
        await helper.clean();
    });
});

describe('enableAlchemyWebhook', () => {
    beforeEach(async () => {
        helper = new Helper(process.env.GCLOUD_PROJECT);
        await helper.firestore
            .collection('users')
            .doc('123')
            .set({ apiKey: 'c51be5b4afd6f008f536611b2c1bf47d:8e167c103709c4238995cefae6975a366e150583cdf9c963de44913aa3f84438' }, { merge: true });

        await helper.workspace.set({ localNetwork: true }, { merge: true });
    });

    it('Should enable the integration and return the token', async () => {
        const wrapped = helper.test.wrap(index.enableAlchemyWebhook);

        const data = {
            workspace: 'hardhat'
        };

        const result = await wrapped(data, auth);

        expect(result.token).toBeTruthy();
    });

    it('Should update the workspace', async () => {
        const wrapped = helper.test.wrap(index.enableAlchemyWebhook);

        const data = {
            workspace: 'hardhat'
        };

        await wrapped(data, auth);

        const wsRef = await helper.workspace.get();

        expect(wsRef.data()).toEqual({ localNetwork: true, settings: { integrations: ['alchemy'] } });
    });

    afterEach(async () => {
        await helper.clean();
    });
});

describe('getWebhookToken', () => {
    beforeEach(async () => {
        helper = new Helper(process.env.GCLOUD_PROJECT);
        await helper.firestore
            .collection('users')
            .doc('123')
            .set({ apiKey: 'c51be5b4afd6f008f536611b2c1bf47d:8e167c103709c4238995cefae6975a366e150583cdf9c963de44913aa3f84438' }, { merge: true });

        await helper.workspace.set({ localNetwork: true }, { merge: true });
    });

    it('Should return the token', async () => {
         const wrapped = helper.test.wrap(index.getWebhookToken);

        const data = {
            workspace: 'hardhat'
        };

        const result = await wrapped(data, auth);

        expect(result.token).toBeTruthy();
    });

    afterEach(async () => {
        await helper.clean();
    });
});

describe('disableAlchemyWebhook', () => {
    beforeEach(async () => {
        helper = new Helper(process.env.GCLOUD_PROJECT);
        await helper.firestore
            .collection('users')
            .doc('123')
            .set({ apiKey: 'c51be5b4afd6f008f536611b2c1bf47d:8e167c103709c4238995cefae6975a366e150583cdf9c963de44913aa3f84438' }, { merge: true });

        await helper.workspace.set({ localNetwork: true }, { merge: true });
    });

    it('Should update the workspace', async () => {
        const wrapped = helper.test.wrap(index.disableAlchemyWebhook);

        const data = {
            workspace: 'hardhat'
        };

        await wrapped(data, auth);

        const userRef = await helper.workspace.get();

        expect(userRef.data()).toEqual({ localNetwork: true, settings: { integrations: [] } });
    });

    afterEach(async () => {
        await helper.clean();
    });
});

describe('importContract', () => {
    beforeEach(async () => {
        helper = new Helper(process.env.GCLOUD_PROJECT);
    });

    it('Should import the name & ABI if the contract is verified on Etherscan', async () => {
        axios.get.mockImplementation(() => ({
            data: {
                message: 'OK',
                result: [{
                    ContractName: 'Contract',
                    ABI: JSON.stringify({ my: 'function' })
                }]
            }
        }));

        const data = {
            workspace: 'hardhat',
            contractAddress: '0x123'
        };

        const wrapped = helper.test.wrap(index.importContract);

        const result = await wrapped(data, auth);

        const contractRef = await helper.workspace
            .collection('contracts')
            .doc('0x123')
            .get();

        expect(contractRef.data()).toEqual({
            address: '0x123',
            name: 'Contract',
            abi: { my: 'function' },
            imported: true
        });
        expect(result).toEqual({ success: true });
    });

    it('Should return an error message if the contract does not exist', async () => {
        axios.get.mockImplementation(() => ({
            data: {
                message: 'NOTOK',
                result: 'Nothing at this address'
            }
        }));

        const data = {
            workspace: 'hardhat',
            contractAddress: '0x123'
        };

        const wrapped = helper.test.wrap(index.importContract);

        await expect(async () => {
            await wrapped(data, auth);
        }).rejects.toThrow({ message: 'Nothing at this address' });
    });

    it('Should return an error message if the contract is not verified on Etherscan', async () => {
        axios.get.mockImplementation(() => ({
            data: {
                message: 'OK',
                result: [{
                    ContractName: '',
                    ABI: JSON.stringify({})
                }]
            }
        }));

        const data = {
            workspace: 'hardhat',
            contractAddress: '0x123'
        };

        const wrapped = helper.test.wrap(index.importContract);

        await expect(async () => {
            await wrapped(data, auth);
        }).rejects.toThrow({ message: `Couldn't find contract on Etherscan, make sure the address is correct and that the contract has been verified.` });
    });

    afterEach(async () => {
        await helper.clean();
    });    
});

describe('setPrivateKey', () => {
    beforeEach(async () => {
        helper = new Helper(process.env.GCLOUD_PROJECT);
        await helper.workspace
            .collection('accounts')
            .doc('0x123')
            .set({ address: '0x123' });
    });

    it('Should store the private key for a new user', async () => {
        const wrapped = helper.test.wrap(index.setPrivateKey);

        const data = {
            workspace: 'hardhat',
            account: '0x123',
            privateKey: 'abcdef'
        };

        const result = await wrapped(data, auth);

        const accountRef = await helper.workspace
            .collection('accounts')
            .doc('0x123')
            .get();

        expect(accountRef.data().privateKey).toBeTruthy();
        expect(accountRef.data().privateKey).not.toEqual('abcdef');
        expect(result).toEqual({ success: true });
    });

    afterEach(async () => {
        await helper.clean();
    });    
});

describe('getAccount', () => {
    beforeEach(async () => {
        helper = new Helper(process.env.GCLOUD_PROJECT);
    });

    it('Should return the account with a decrypted key', async () => {
        await helper.workspace
            .collection('accounts')
            .doc('0x123')
            .set({ address: '0x123', balance: '1000', privateKey: 'c51be5b4afd6f008f536611b2c1bf47d:8e167c103709c4238995cefae6975a366e150583cdf9c963de44913aa3f84438' });
        
        const wrapped = helper.test.wrap(index.getAccount);

        const data = {
            workspace: 'hardhat',
            account: '0x123'
        };

        const result = await wrapped(data, auth);

        expect(result).toEqual({ address: '0x123', balance: '1000', privateKey: 'GT8P7FD-R2M4SCG-GPCYE58-8FC1969' })
    });

    it('Should return an account without a key', async () => {
        await helper.workspace
            .collection('accounts')
            .doc('0x123')
            .set({ address: '0x123', balance: '1000' });

        const wrapped = helper.test.wrap(index.getAccount);

        const data = {
            workspace: 'hardhat',
            account: '0x123'
        };

        const result = await wrapped(data, auth);

        expect(result).toEqual({ address: '0x123', balance: '1000' });
    });

    afterEach(async () => {
        await helper.clean();
    });
});

describe('impersonateAccount', () => {
    beforeEach(async () => {
        helper = new Helper(process.env.GCLOUD_PROJECT);
    });

    it('Should impersonate an account on a hardhat network', async () => {
        const wrapped = helper.test.wrap(index.impersonateAccount);

        const data = {
            accountAddress: '0x123',
            rpcServer: 'http://localhost:8545'
        };

        const result = await wrapped(data, auth);

        expect(result).toBe(true);
    });

    it('Should impersonate an account on a non-hardhat network', async () => {
        ethers.providers.JsonRpcProvider.mockImplementation(() => ({
            send: (command) => {
                return new Promise((resolve) => {
                    switch(command) {
                        case 'hardhat_impersonateAccount':
                            resolve(false)
                            break;
                        case 'evm_unlockUnknownAccount':
                            resolve(true);
                            break;
                        default:
                            resolve(false);
                            break;
                    }
                })
            }
        }));
        const wrapped = helper.test.wrap(index.impersonateAccount);

        const data = {
            accountAddress: '0x123',
            rpcServer: 'http://localhost:8545'
        };

        const result = await wrapped(data, auth);

        expect(result).toBe(true);
    });    

    afterEach(async () => {
        await helper.clean();
    });    
});

describe('createWorkspace', () => {
    beforeEach(async () => {
        helper = new Helper(process.env.GCLOUD_PROJECT);
    });

    it('Should create a new workspace', async () => {
        const wrapped = helper.test.wrap(index.createWorkspace);

        const data = {
            name: 'Ganache',
            workspaceData: {
                rpcServer: 'http://localhost:8545',
                networkId: 1,
                settings: {
                    gasLimit: 1000,
                    defaultAccount: '0x123'
                }
            }
        };

        const result = await wrapped(data, auth);

        const wsRef = await helper.firestore
            .collection('users')
            .doc('123')
            .collection('workspaces')
            .doc('Ganache')
            .get();

        expect(wsRef.data()).toEqual(data.workspaceData);
        expect(result).toEqual({ success: true });
    });
});

describe('setCurrentWorkspace', () => {
    beforeEach(async () => {
        helper = new Helper(process.env.GCLOUD_PROJECT);
    });

    it('Should update the default workspace', async () => {
        const firestoreConverter = async (snapshot, options) => {
            const data = snapshot.data(options);
            const workspace = (await data.currentWorkspace.get()).data();
            Object.defineProperty(data, 'currentWorkspace', { value: workspace });
            return data;
        };
        await helper.firestore
            .collection('users')
            .doc('123')
            .collection('workspaces')
            .doc('Ganache')
            .set({ rpcServer: 'http://localhost:7545' });

        const wrapped = helper.test.wrap(index.setCurrentWorkspace);

        const data = {
            name: 'Ganache'
        };

        const result = await wrapped(data, auth);

        const userRef = await helper.firestore
            .collection('users')
            .doc('123')
            .withConverter({ fromFirestore: firestoreConverter })
            .get();

        expect(await userRef.data()).toEqual({ currentWorkspace: { rpcServer: 'http://localhost:7545' }});
        expect(result).toEqual({ success: true });
    });

    afterEach(async () => {
        await helper.clean();
    });
});

describe('syncBalance', () => {
    beforeEach(async () => {
        helper = new Helper(process.env.GCLOUD_PROJECT);
    });

    it('Should update the account balance', async () => {
        await helper.workspace
            .collection('accounts')
            .doc('0x123')
            .set({ balance: '1234' });

        const wrapped = helper.test.wrap(index.syncBalance);

        const data = {
            workspace: 'hardhat',
            account: '0x123',
            balance: '1000000'
        };

        const result = await wrapped(data, auth);

        const accountRef = await helper.workspace
            .collection('accounts')
            .doc('0x123')
            .get();

        expect(accountRef.data()).toEqual({ balance: '1000000' });
        expect(result).toEqual({ success: true });
    });

    afterEach(async () => {
        await helper.clean();
    });
});

describe('updateWorkspaceSettings', () => {
    beforeEach(async () => {
        helper = new Helper(process.env.GCLOUD_PROJECT);
        await helper.workspace
            .set({
                settings: {
                    defaultAccount: '0x123',
                    gasLimit: '1000',
                    gasPrice: '1'
                },
                advancedOptions: {
                    tracing: 'disabled'
                }
            });
    });

    it('Should allow advanced options update', async () => {
        const wrapped = helper.test.wrap(index.updateWorkspaceSettings);

        const data = {
            workspace: 'hardhat',
            settings: {
                advancedOptions: {
                    tracing: 'hardhat'
                }
            }
        };

        const result = await wrapped(data, auth);

        const wsRef = await helper.workspace.get();

        expect(result).toEqual({ success: true });
        expect(wsRef.data()).toEqual({
            settings: {
                defaultAccount: '0x123',
                gasLimit: '1000',
                gasPrice: '1'
            },
            advancedOptions: {
                tracing: 'hardhat'
            }
        });
    });

    it('Should allow settings update', async () => {
        const wrapped = helper.test.wrap(index.updateWorkspaceSettings);

        const data = {
            workspace: 'hardhat',
            settings: {
                settings : {
                    defaultAccount: '0x124',
                    gasLimit: '2000',
                    gasPrice: '2'
                }
            }
        };

        const result = await wrapped(data, auth);

        const wsRef = await helper.workspace.get();

        expect(result).toEqual({ success: true });
        expect(wsRef.data()).toEqual({
            settings: {
                defaultAccount: '0x124',
                gasLimit: '2000',
                gasPrice: '2'
            },
            advancedOptions: {
                tracing: 'disabled'
            }
        });
    });

    it('Should prevent updating a non-whitelisted setting', async () => {
        const wrapped = helper.test.wrap(index.updateWorkspaceSettings);

        const data = {
            workspace: 'hardhat',
            settings: {
                settings : {
                    thing: 'no'
                }
            }
        };

        const result = await wrapped(data, auth);

        const wsRef = await helper.workspace.get();

        expect(result).toEqual({ success: true });
        expect(wsRef.data()).toEqual({
            settings : {
                defaultAccount: '0x123',
                gasLimit: '1000',
                gasPrice: '1'
            },
            advancedOptions: {
                tracing: 'disabled'
            }
        });
    });

    it('Should prevent updating a non-whitelisted advanced option', async () => {
        const wrapped = helper.test.wrap(index.updateWorkspaceSettings);

        const data = {
            workspace: 'hardhat',
            settings: {
                advancedOptions: {
                    thisis: 'notavalidoption'
                }
            }
        };

        const result = await wrapped(data, auth);

        const wsRef = await helper.workspace.get();

        expect(result).toEqual({ success: true });
        expect(wsRef.data()).toEqual({
            settings: {
                defaultAccount: '0x123',
                gasLimit: '1000',
                gasPrice: '1'
            },
            advancedOptions: {
                tracing: 'disabled'
            }
        });
    });

    afterEach(async () => {
        await helper.clean();
    });
});