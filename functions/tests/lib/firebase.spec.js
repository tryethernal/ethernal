const Helper = require('../helper');
const admin = require('firebase-admin');
const {
    storeBlock,
    storeTransaction,
    storeContractData,
    storeContractArtifact,
    storeContractDependencies,
    getContractData,
    getUserByKey,
    getWorkspaceByName,
    storeApiKey,
    getUser,
    addIntegration,
    removeIntegration,
    storeAccountPrivateKey,
    getAccount,
    storeTrace,
    getContractByHashedBytecode,
    createWorkspace,
    updateAccountBalance,
    setCurrentWorkspace,
    updateWorkspaceSettings,
    getContractRef,
    resetDatabaseWorkspace,
    getContractArtifact,
    getContractArtifactDependencies,
    getUserbyStripeCustomerId,
    getCollectionRef,
    getUserWorkspaces,
    removeDatabaseContractArtifacts,
    getUnprocessedContracts
} = require('../../lib/firebase');

const Block = require('../fixtures/Block');
const Transaction = require('../fixtures/Transaction');
const AmalfiContract = require('../fixtures/AmalfiContract');
const ProcessedTrace = require('../fixtures/ProcessedTrace');

let helper;

beforeEach(() => {
    helper = new Helper(process.env.GCLOUD_PROJECT);
});

afterEach(async () => {
    await helper.clean();
});

describe('getUser', () => {
    it('Should return user data', async () => {
        await helper.firestore
            .collection('users')
            .doc('123')
            .set({ apiKey: '123' });

        const result = await getUser('123');

        expect(result.data()).toEqual({
            apiKey: '123'
        });
    });
});

describe('addIntegration', () => {
    it('Should update settings with the new integration', async () => {
        await helper.workspace.set({ localNetwork: true });

        const result = await addIntegration('123', 'hardhat', 'alchemy');

        const wsRef = await helper.workspace.get();

        expect(wsRef.data()).toEqual({
            localNetwork: true,
            settings: {
                integrations: ['alchemy']
            }
        });
    });
});

describe('removeIntegration', () => {
    it('Should remove the integration from the settings', async () => {
        await helper.workspace.set({ localNetwork: true, settings: { integrations: ['alchemy'] }});

        await removeIntegration('123', 'hardhat', 'alchemy');

        const wsRef = await helper.workspace.get();

        expect(wsRef.data()).toEqual({
            localNetwork: true,
            settings: {
                integrations: []
            }
        });
    });
});

describe('getUserByKey', () => {
    it('Should return user data', async () => {
        await helper.firestore
            .collection('users')
            .doc('123')
            .set({ apiKey: '123', currentWorkspace: 'hardhat' });

        const result = await getUserByKey('123');

        expect(result).toEqual({
            apiKey: '123',
            currentWorkspace: 'hardhat',
            uid: '123'
        });
    });

    it('Should return null if no user', async () => {
        const result = await getUserByKey('123');
        expect(result).toBeNull();
    });
});

describe('createWorkspace', () => {
    it('Should create a new workspace', async () => {
        await createWorkspace('123', 'Ganache', { localNetwork: true, settings: { gasLimit: 1234 }});

        const wsRef = await helper.firestore
            .collection('users')
            .doc('123')
            .collection('workspaces')
            .doc('Ganache')
            .get();

        expect(wsRef.data()).toEqual({
            localNetwork: true,
            settings: {
                gasLimit: 1234
            }
        });
    });
});

describe('storeApiKey', () => {
    it('Should store the api key', async () => {
        await helper.firestore
            .collection('users')
            .doc('123')
            .set({ currentWorkspace: 'hardhat' });

        await storeApiKey('123', 'abcdef');

        const userRef = await helper.firestore
            .collection('users')
            .doc('123')
            .get();

        expect(userRef.data().apiKey).toEqual('abcdef');
    });
});

describe('getWorkspaceByName', () => {
    it('Should return the corresponding workspace', async () => {
        await helper.workspace.set({ localNetwork: true });

        const result = await getWorkspaceByName('123', 'hardhat');

        expect(result).toEqual({ name: 'hardhat', localNetwork: true });
    });
});

describe('storeBlock', () => {
    it('Should add the block in the db if it does not exist', async () => {
        await storeBlock('123', 'hardhat', Block);

        const blockRef = await helper.workspace
            .collection('blocks')
            .doc(Block.number)
            .get();

        expect(blockRef.data()).toMatchSnapshot();
    });

    it('Should merge the block if it already exists', async () => {
        await helper.workspace
            .collection('blocks')
            .doc(Block.number)
            .set(Block);

        await storeBlock('123', 'hardhat', {
            number: '1',
            hash: '0x123'
        });

        const blockRef = await helper.workspace
            .collection('blocks')
            .doc(Block.number)
            .get();

        expect(blockRef.data()).toMatchSnapshot();
    });
});

describe('storeTransaction', () => {
    it('Should add the tx in the db if it does not exist', async () => {
        await storeTransaction('123', 'hardhat', Transaction);

        const txRef = await helper.workspace
            .collection('transactions')
            .doc(Transaction.hash)
            .get();

        expect(txRef.data()).toMatchSnapshot();
    });

    it('Should merge the tx if it already exists', async () => {
        await helper.workspace
            .collection('transactions')
            .doc(Transaction.hash)
            .set(Transaction);

        await storeTransaction('123', 'hardhat', {
            hash: '0xb750fb9dd193bb4a46ea5426837c469815d2494abd68a94b1c2c190f3569c5b8',
            from: '0x123'
        });

        const txRef = await helper.workspace
            .collection('transactions')
            .doc(Transaction.hash)
            .get();

        expect(txRef.data()).toMatchSnapshot();        
    })
});

describe('storeContractData', () => {
    it('Should add contract data if it does not exist', async () => {
        await storeContractData('123', 'hardhat', '0x123', { address: '0x123', name: 'Amalfi' });

        const contractRef = await helper.workspace
            .collection('contracts')
            .doc('0x123')
            .get();

        expect(contractRef.data()).toEqual({
            address: '0x123',
            name: 'Amalfi'
        })
    });

    it('Should merge contract data if it already exists', async () => {
        await helper.workspace
            .collection('contracts')
            .doc('0x123')
            .set({ address: '0x123' });

        await storeContractData('123', 'hardhat', '0x123', { name: 'Amalfi' });

        const contractRef = await helper.workspace
            .collection('contracts')
            .doc('0x123')
            .get();

        expect(contractRef.data()).toEqual({
            address: '0x123',
            name: 'Amalfi'
        });
    });
});

describe('storeContractArtifact', () => {
    it('Should store the contract artifact', async () => {
        const contractArtifact = JSON.stringify(AmalfiContract.artifact);
        
        await storeContractArtifact('123', 'hardhat', '0x123', contractArtifact);

        const artifactRef = await helper.database.ref('/users/123/workspaces/hardhat/contracts/0x123/artifact').once('value');

        expect(artifactRef.val()).toEqual(contractArtifact);
    });
});

describe('getContractArtifact', () => {
    it('Should retrieve the contract artifact', async () => {
        const contractArtifact = JSON.stringify(AmalfiContract.artifact);
        await helper.database.ref('/users/123/workspaces/hardhat/contracts/0x123/artifact').set(contractArtifact);

        const artifactRef = await getContractArtifact('123', 'hardhat', '0x123');

        expect(artifactRef.val()).toEqual(contractArtifact);
    });
});

describe('getContractArtifactDependencies', () => {
    it('Should retrieve the contract artifact', async () => {
        const contractDependency = JSON.stringify(AmalfiContract.dependencies['Address']);
        await helper.database.ref('/users/123/workspaces/hardhat/contracts/0x123/dependencies').update({ Address: contractDependency });

        const artifactDependenciesRef = await getContractArtifactDependencies('123', 'hardhat', '0x123');

        expect(artifactDependenciesRef.val()).toEqual({ Address: contractDependency });
    });
});

describe('storeContractDependencies', () => {
    it('Should store the contract dependencies', async () => {
        const contractDependency = JSON.stringify(AmalfiContract.dependencies['Address']);
        await storeContractDependencies('123', 'hardhat', '0x123', { Address: contractDependency });

        const artifactRef = await helper.database.ref('/users/123/workspaces/hardhat/contracts/0x123/dependencies').once('value');

        expect(artifactRef.val()).toEqual({ Address: contractDependency });
    });
});

describe('resetDatabaseWorkspace', () => {
    it('Should remove everything in the rtdb workspace', async () => {
        const contractArtifact = JSON.stringify(AmalfiContract.artifact);
        await storeContractArtifact('123', 'hardhat', '0x123', contractArtifact);

        await resetDatabaseWorkspace('123', 'hardhat');

        const artifactRef = await helper.database.ref('/users/123/workspaces/hardhat/contracts/0x123/artifact').once('value');

        expect(artifactRef.val()).toBeNull();        
    });
});

describe('getContractData', () => {
    it('Should return the contract data', async () => {
        await helper.workspace
            .collection('contracts')
            .doc('0x123')
            .set({ address: '0x123', name: 'Amalfi' });

        const result = await getContractData('123', 'hardhat', '0x123');

        expect(result).toEqual({
            id: '0x123',
            address: '0x123',
            name: 'Amalfi'
        });
    });

    it('Should return null if no contract data', async () => {
        const result = await getContractData('123', 'hardhat', '0x123');

        expect(result).toBeNull();
    });
});

describe('getContractRef', () => {
    it('Should return the contract ref', async () => {
        await helper.workspace
            .collection('contracts')
            .doc('0x123')
            .set({ address: '0x123', name: 'Amalfi' });

        const result = getContractRef('123', 'hardhat', '0x123');

        expect(result._firestore).toBeTruthy();
    });
});

describe('getContractByHashedBytecode', () => {
    it('Should return contract data', async () => {
        await helper.workspace
            .collection('contracts')
            .doc('0x123')
            .set({ address: '0x123', name: 'Amalfi', hashedBytecode: '0xabc' });

        const result = await getContractByHashedBytecode('123', 'hardhat', '0xabc', ['0xdef']);

        expect(result).toEqual({
            uid: '0x123',
            address: '0x123',
            name: 'Amalfi',
            hashedBytecode: '0xabc'
        });
    });

    it('Should not return data for excluded contract', async () => {
        await helper.workspace
            .collection('contracts')
            .doc('0x123')
            .set({ address: '0x123', name: 'Amalfi', hashedBytecode: '0xabc' });

        const result = await getContractByHashedBytecode('123', 'hardhat', '0xabc', ['0x123']);

        expect(result).toBeNull();
    });

    it('Should return null if no contracts found', async () => {
        const result = await getContractByHashedBytecode('123', 'hardhat', '0xabc', ['0x124']);

        expect(result).toBeNull();
    });
});

describe('storeAccountPrivateKey', () => {
    it('Should store the private key', async () => {
        await storeAccountPrivateKey('123', 'hardhat', '0x123', '0xabcd');

        const accountRef = await helper.workspace
            .collection('accounts')
            .doc('0x123')
            .get();

        expect(accountRef.data().privateKey).toEqual('0xabcd');
    });
});

describe('getAccount', () => {
    it('Should return the account', async () => {
        await helper.workspace
            .collection('accounts')
            .doc('0x123')
            .set({ address: '0x123', balance: '1234' });

        const result = await getAccount('123', 'hardhat', '0x123');

        expect(result).toEqual({
            id: '0x123',
            address: '0x123',
            balance: '1234'
        });
    });

    it('Should return null if no account', async () => {
        const result = await getAccount('123', 'hardhat', '0x123');

        expect(result).toBeNull();
    });
});

describe('storeTrace', () => {
    it('Should store the trace without overriding the tx', async () => {
        await helper.workspace
            .collection('transactions')
            .doc(Transaction.hash)
            .set(Transaction);

        await storeTrace('123', 'hardhat', Transaction.hash, ProcessedTrace);

        const txRef = await helper.workspace
            .collection('transactions')
            .doc(Transaction.hash)
            .get();

        expect(txRef.data()).toMatchSnapshot();
    });
});

describe('updateAccountBalance', () => {
    it('Should update the account balance', async () => {
        await helper.workspace
            .collection('accounts')
            .doc('0x123')
            .set({ address: '0x123', balance: '1234' });

        await updateAccountBalance('123', 'hardhat', '0x123', '12345');

        const accountRef = await helper.workspace
            .collection('accounts')
            .doc('0x123')
            .get();

        expect(accountRef.data()).toEqual({ address: '0x123', balance: '12345' });
    });
});

describe('setCurrentWorkspace', () => {
    it('Should update the current workspace', async () => {
        await helper.firestore
            .collection('users')
            .doc('123')
            .set({ currentWorkspace: 'hardhat' });

        await helper.firestore
            .collection('users')
            .doc('123')
            .collection('workspaces')
            .doc('Ganache')
            .set({ localNetwork: true });

        await setCurrentWorkspace('123', 'Ganache');

        const userRef = await helper.firestore
            .collection('users')
            .doc('123')
            .get();

        const wsRef = await userRef.data().currentWorkspace.get();

        expect(wsRef.id).toBe('Ganache');
        expect(wsRef.data()).toEqual({ localNetwork: true });
    });

    it('Should return an error if workspace does not exist', async () => {
        await helper.firestore
            .collection('users')
            .doc('123')
            .set({ currentWorkspace: 'hardhat' });

        setCurrentWorkspace('123', 'Ganache').catch((error) => {
            expect(error).toBe('This workspace does not exist.');
        });
    });
});

describe('updateWorkspaceSettings', () => {
    it('Should update workspace settings', async () => {
        await helper.workspace
            .set({ settings: { gasLimit: '123' }});

        await updateWorkspaceSettings('123', 'hardhat', { settings: { gasLimit: '12345' }});

        const wsRef = await helper.workspace.get();

        expect(wsRef.data().settings).toEqual({ gasLimit: '12345' });
    });

    it('Should update workspace advanced options', async () => {
        await helper.workspace
            .set({ advancedOptions: { tracing: 'disabled' }});

        await updateWorkspaceSettings('123', 'hardhat', { advancedOptions: { tracing: 'hardhat' }});

        const wsRef = await helper.workspace.get();

        expect(wsRef.data().advancedOptions).toEqual({ tracing: 'hardhat' });
    });
});

describe('getCollectionRef', () => {
    it('Should return a reference to the collection', async () => {
        await helper.workspace
            .collection('contracts')
            .doc('0x123')
            .set({ name: '123' });

        const result = getCollectionRef('123', 'hardhat', 'contracts');
        expect(result.constructor.name).toEqual('CollectionReference')
    });
});

describe('getUserWorkspaces', () => {
    it('Should return all workspaces of the given user', async () => {
        for (let i = 0; i < 3; i++)
            await helper.firestore
                .collection('users')
                .doc('123')
                .collection('workspaces')
                .doc(`workspace-${i}`)
                .set({ name: `workspace-${i}` });

        const result = await getUserWorkspaces('123');
        const workspaces = [];
        
        result.forEach((ws) => workspaces.push(ws.data()));

        expect(workspaces).toEqual([
            { name: 'workspace-0' },
            { name: 'workspace-1' },
            { name: 'workspace-2' }
        ]);
    });
});

describe('removeDatabaseContractArtifacts', () => {
    it('Should remove artifacts in rtdb at the given address', async () => {
        const contractDependency = JSON.stringify(AmalfiContract.dependencies['Address']);
        await helper.database.ref('/users/123/workspaces/hardhat/contracts/0x123/dependencies').update({ Address: contractDependency });
    
        await removeDatabaseContractArtifacts('123', 'hardhat', '0x123');

        const artifactRef = await helper.database.ref('/users/123/workspaces/hardhat/contracts/0x123/artifact').once('value');

        expect(artifactRef.val()).toBeNull();
    });
});

describe('getUserbyStripeCustomerId', () => {
    it('Should return a user ref if id is found', async () => {
        await helper.firestore
            .collection('users')
            .doc('123')
            .set({ stripeCustomerId: 'cus_exists' });

        const result = await getUserbyStripeCustomerId('cus_exists');

        expect(result.constructor.name).toEqual('DocumentReference');
    });

    it('Should return null if id is not found(', async () => {
        const result = await getUserbyStripeCustomerId('cus_doesnotexist');
        expect(result).toBeNull();
    });
});

describe('getUnprocessedContracts', () => {
    it('Should only return contracts without the processed property', async () => {
        await helper.workspace
            .collection('contracts')
            .doc('0x123')
            .set({ address: '0x123', processed: true });

        await helper.workspace
            .collection('contracts')
            .doc('0x124')
            .set({ address: '0x124' });

        const result = await getUnprocessedContracts('123', 'hardhat');

        expect(result).toEqual([{ address: '0x124' }]);
    });
});




