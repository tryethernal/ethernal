import Storage from '../fixtures/Storage.json';
import DecodedStorageData from '../fixtures/DecodedStorageData.json';

export default {

    decodeData: function() {
        return new Promise((resolve) => resolve(DecodedStorageData));
    },

    getStructure: function() {
        return new Promise((resolve) => resolve(Storage));
    },

    resetWorkspace: function() {
        return new Promise((resolve) => resolve(true));
    },

    updateWorkspaceSettings: function() {
        return new Promise((resolve) => resolve(true));
    },

    importContract: function() {
        return new Promise((resolve) => resolve(true));
    },

    syncContractData: () => {
        return new Promise((resolve) => resolve(true));
    },

    setCurrentWorkspace: () => {
        return new Promise((resolve) => resolve(true));
    },

    searchForLocalChains: () => {
        return new Promise((resolve) => resolve(['http://127.0.0.1:8545']));
    },

    getAccount: () => {
        return new Promise((resolve) => resolve({ data: { address: '0x1234', privateKey: null }}));
    },

    callContractWriteMethod: () => {
        const pendingTx = {
            hash: '0xabcd',
            wait: () => new Promise((resolve) => resolve({ status: true }))
        }

        return new Promise((resolve) => resolve({ pendingTx: pendingTx }));
    },

    callContractReadMethod: () => {
        return new Promise((resolve, reject) => {
            resolve([true]);
        });
    },

    createWorkspace: () => {
        return new Promise((resolve) => {
            resolve({ data: { success: true }});
        });
    },

    getWebhookToken: () => {
        return new Promise((resolve) => resolve({ data: { token: '123456abcdef' }}));
    },

    enableAlchemyWebhook: () => {
        return new Promise((resolve) => resolve({ data: { token: '123456abcdef' }}));
    },

    disableAlchemyWebhook: () => {
        return new Promise((resolve) => resolve());
    },

    getAccounts: () => {
        return new Promise((resolve) => resolve(['0x1234', '0x1235']));
    },

    syncBalance: () => {
        return new Promise((resolve) => resolve());
    },

    getAccountBalance: () => {
        return new Promise((resolve) => resolve(10000));
    },

    storeAccountPrivateKey: () => {
        return new Promise((resolve) => resolve());
    },

    impersonateAccount: () => {
        return new Promise((resolve) => resolve());
    },
    
    initRpcServer: (rpcServer, localNetwork) => {
        return new Promise((resolve) => resolve({
            rpcServer: rpcServer,
            networkId: 1,
            settings: {
                gasLimit: 1234567
            },
            defaultAccount: '0x2D481eeb2bA97955CD081Cf218f453A817259AB1',
            localNetwork: localNetwork
        }))
    }
}