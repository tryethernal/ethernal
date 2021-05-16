const ethers = require('ethers');
const Web3 = require('web3');
const Decoder = require("@truffle/decoder");

import { Storage } from '../lib/storage';
import { functions } from './firebase';
import { sanitize } from '../lib/utils';
import { parseTrace } from '../lib/trace';

const serverFunctions = {
    // Private
    _getDependenciesArtifact: function(contract) {
        return contract.dependencies ? Object.entries(contract.dependencies).map(dep => JSON.parse(dep[1].artifact)) : [];
    },
    _buildStructure: async function(contract, rpcServer) {
        var web3 = new Web3(serverFunctions._getWeb3Provider(rpcServer));
        var parsedArtifact = JSON.parse(contract.artifact);
        var contractAddress = contract.address;
        var dependenciesArtifacts = serverFunctions._getDependenciesArtifact(contract);
        var instanceDecoder = await Decoder.forArtifactAt(parsedArtifact, web3, contractAddress, dependenciesArtifacts);
        var storage = new Storage(instanceDecoder);
        await storage.buildStructure();
        return storage;
    },
    _getWeb3Provider: function(url) {
        const rpcServer = new URL(url);
        var provider;
        if (rpcServer.protocol == 'http:' || rpcServer.protocol == 'https:') {
            provider = Web3.providers.HttpProvider;
        }
        else if (rpcServer.protocol == 'ws:' || rpcServer.protocol == 'wss:') {
            provider = Web3.providers.WebsocketProvider;
        }
        return new provider(url);
    },
    _getProvider: function(url) {
        const rpcServer = new URL(url);
        var urlInfo;
        var provider = ethers.providers.WebSocketProvider;

        if (rpcServer.username != '' && rpcServer.password != '') {
            urlInfo = {
                url: `${rpcServer.origin}${rpcServer.pathName ? rpcServer.pathName : ''}`,
                user: rpcServer.username,
                password: rpcServer.password
            };
        }
        else {
            urlInfo = rpcServer.href;
        }

        if (rpcServer.protocol == 'http:' || rpcServer.protocol == 'https:') {
            provider = ethers.providers.JsonRpcProvider;
        }
        else if (rpcServer.protocol == 'ws:' || rpcServer.protocol == 'wss:') {
            provider = ethers.providers.WebSocketProvider;
        }

        return new provider(urlInfo);
    },

    // Public
    getStructure: async function(data) {
        try {
            var structure = await serverFunctions._buildStructure(data.contract, data.rpcServer, data.dependenciesArtifact);
            await structure.watch(data.contract.watchedPaths);
            return structure.toJSON();
        } catch(error) {
            console.log(error);
            var reason = error.reason || error.message || "Can't connect to the server";
            throw { reason: reason };
        }
    },
    getAccounts: async function(data) {
        try {
            const rpcProvider = new serverFunctions._getProvider(data.rpcServer);
            return await rpcProvider.listAccounts();
        } catch(error) {
            console.log(error);
            var reason = error.reason || error.message || "Can't connect to the server";
            throw { reason: reason };
        }
    },
    getAccountBalance: async function(data) {
        try {
            const rpcProvider = new serverFunctions._getProvider(data.rpcServer);
            var balance = await rpcProvider.getBalance(data.account);
        return balance;
        } catch(error) {
            console.log(error);
            var reason = error.reason || error.message || "Can't connect to the server";
            throw { reason: reason };
        }
    },
    decodeData: async function(data) {
        try {
            var structure = await serverFunctions._buildStructure(data.contract, data.rpcServer);
            await structure.watch(data.contract.watchedPaths);
            var decoded = await structure.decodeData(data.blockNumber);
            return decoded;
        } catch(error) {
            console.log(error);
            var reason = error.reason || error.message || "Can't connect to the server";
            throw { reason: reason };
        }
    },
    initRpcServer: async function(data) {
        try {
            const rpcProvider = new serverFunctions._getProvider(data.rpcServer);
            const web3Rpc = new Web3(serverFunctions._getWeb3Provider(data.rpcServer));
            var networkId = await web3Rpc.eth.net.getId();
            var latestBlockNumber = await rpcProvider.getBlockNumber();
            var latestBlock = await rpcProvider.getBlock(latestBlockNumber);
            var accounts = await rpcProvider.listAccounts();
            var gasLimit = latestBlock.gasLimit.toString();

            var workspace = {
                rpcServer: data.rpcServer,
                networkId: networkId,
                settings: {
                    gasLimit: gasLimit
                }
            };

            if (accounts.length)
                workspace.settings.defaultAccount = accounts[0];

            return workspace;
        } catch(error) {
            console.log(error);
            const reason = error.body ? JSON.parse(error.body).error.message : error.reason || error.message || "Can't connect to the server";
            throw { reason: reason };
        }
    },
    callContractReadMethod: async function(data) {
        try {
            var provider = serverFunctions._getProvider(data.rpcServer);
            var signer;
            var options = sanitize({
                gasLimit: data.options.gasLimit,
                gasPrice: data.options.gasPrice,
            });

            if (data.options.pkey) {
                signer = new ethers.Wallet(data.options.pkey, provider);
            }
            else {
                signer = provider.getSigner(data.options.from);
            }
            var contract = new ethers.Contract(data.contract.address, data.contract.abi, signer);
            return (await contract.functions[data.method](...Object.values(data.params), options));
        } catch(error) {
            console.log(error);
            const reason = error.body ? JSON.parse(error.body).error.message : error.reason || error.message || "Can't connect to the server";
            throw { reason: reason };
        }
    },
    callContractWriteMethod: async function(data) {
        try {
            var provider = serverFunctions._getProvider(data.rpcServer);
            var signer;
            var options = sanitize({
                gasLimit: data.options.gasLimit,
                gasPrice: data.options.gasPrice,
                value: data.options.value,
            });

            if (data.options.privateKey) {
                signer = new ethers.Wallet(data.options.privateKey, provider);
            }
            else {
                signer = provider.getSigner(data.options.from);
            }
            var contract = new ethers.Contract(data.contract.address, data.contract.abi, signer);

            const pendingTx = await contract[data.method](...Object.values(data.params), options);
            const trace = await serverFunctions.traceTransaction(data.rpcServer, pendingTx.hash);

            return sanitize({
                pendingTx: pendingTx,
                trace: trace
            });
        } catch(error) {
            console.log(error);
            const reason = error.body ? JSON.parse(error.body).error.message : error.reason || error.message || "Can't connect to the server";
            if (reason == 'invalid hexlify value')
                throw { reason: `Invalid private key format for ${data.options.from}. Please correct it in the "Accounts" page` };
            else
                throw { reason: reason };
        }
    },
    traceTransaction: async function(rpcServer, hash) {
        try {
            const rpcProvider = new serverFunctions._getProvider(rpcServer);
            const transaction = await rpcProvider.getTransaction(hash);
            const trace = await rpcProvider.send('debug_traceTransaction', [hash, {}]).catch(() => null);

            if (trace)
                return await parseTrace(transaction.to, trace);
            else
                return null;
        } catch(error) {
            console.log(error);
            const reason = error.body ? JSON.parse(error.body).error.message : error.reason || error.message || "Can't connect to the server";
            throw { reason: reason };
        }
    },
    impersonateAccount: async function(data) {
        try {
            const rpcProvider = new serverFunctions._getProvider(data.rpcServer)
            const hardhatResult = await rpcProvider.send('hardhat_impersonateAccount', [data.accountAddress]).catch(console.log);
            if (hardhatResult) {
                return true;
            }
            const ganacheResult = await rpcProvider.send('evm_unlockUnknownAccount', [data.accountAddress]).catch(console.log);
            return ganacheResult;

        } catch(error) {
            console.log(error);
            const reason = error.body ? JSON.parse(error.body).error.message : error.reason || error.message || "Can't connect to the server";
            throw { reason: reason };
        }
    }
};

export const serverPlugin = {
    install(Vue, options) {
        var store = options.store;

        var _isLocalNetwork = function() {
            return store.getters.currentWorkspace.localNetwork;
        };

        var _rpcServer = function() {
            return store.getters.currentWorkspace.rpcServer;
        };

        Vue.prototype.server = {
            syncContractData: function(workspace, address, name, abi) {
                return functions.httpsCallable('syncContractData')({ workspace: workspace, address: address, name: name, abi: abi });
            },
            syncTrace: function(workspace, txHash, trace) {
                return functions.httpsCallable('syncTrace')({ workspace: workspace, txHash: txHash, steps: trace });
            },
            getAccount: function(workspace, account) {
                return functions.httpsCallable('getAccount')({ workspace: workspace, account: account });
            },
            storeAccountPrivateKey: function(workspace, account, privateKey) {
                return functions.httpsCallable('setPrivateKey')({ workspace: workspace, account: account, privateKey });
            },
            importContract: function(workspace, abi, address, name) {
                return functions.httpsCallable('importContract')({ workspace: workspace, abi: abi, address: address, name: name });
            },
            getWebhookToken: function(workspace) {
                return functions.httpsCallable('getWebhookToken')({ workspace: workspace });
            },
            enableAlchemyWebhook: function(workspace) {
                return functions.httpsCallable('enableAlchemyWebhook')({ workspace: workspace });
            },
            disableAlchemyWebhook: function(workspace) {
                return functions.httpsCallable('disableAlchemyWebhook')({ workspace: workspace });
            },
            getProvider: function(url) {
                return serverFunctions._getProvider(url);
            },
            searchForLocalChains: async function() {
                try {
                    const endpoints = [
                        'http://127.0.0.1:7545',
                        'http://127.0.0.1:8545',
                        'http://127.0.0.1:9545',
                        'ws://127.0.0.1:7545',
                        'ws://127.0.0.1:8545',
                        'ws://127.0.0.1:9545'
                    ];

                    var res = [];
                    for (var i = 0; i < endpoints.length; i++) {
                        const web3Rpc = new Web3(serverFunctions._getWeb3Provider(endpoints[i]));
                        var networkId = await web3Rpc.eth.net.getId().catch(() => {});
                        if (networkId) {
                            res.push(endpoints[i])
                        }
                    }

                    return res;
                } catch(error) {
                    console.log(error)
                }
            },
            impersonateAccount: function(rpcServer, accountAddress) {
                if (_isLocalNetwork()) {
                    return new Promise((resolve, reject) => {
                        serverFunctions
                            .impersonateAccount({ rpcServer: rpcServer, accountAddress: accountAddress })
                            .then(resolve)
                            .catch(reject)
                    });
                }
                else {
                    return new Promise((resolve, reject) => {
                        functions
                            .httpsCallable('impersonateAccount')({ accountAddress: accountAddress })
                            .then((res) => resolve(res.data))
                            .catch(reject)
                    });
                }
            },
            getAccounts: function() {
                if (_isLocalNetwork()) {
                    return new Promise((resolve, reject) => {
                        serverFunctions
                            .getAccounts({ rpcServer: _rpcServer() })
                            .then(resolve)
                            .catch(reject)
                    });
                }
                else {
                    return new Promise((resolve, reject) => {
                        functions
                            .httpsCallable('getAccounts')({ rpcServer: _rpcServer() })
                            .then((res) => resolve(res.data))
                            .catch(reject)
                    });
                }
            },
            getAccountBalance: function(account) {
                if (_isLocalNetwork()) {
                    return new Promise((resolve, reject) => {
                        serverFunctions
                            .getAccountBalance({ rpcServer: _rpcServer(), account: account })
                            .then(resolve)
                            .catch(reject)
                    });
                }
                else {
                    return new Promise((resolve, reject) => {
                        functions
                            .httpsCallable('getAccountBalance')({ rpcServer: _rpcServer(), account: account })
                            .then((res) => resolve(res.data))
                            .catch(reject)
                    });
                }
            },
            initRpcServer: function(rpcServer, localNetwork) {
                if (localNetwork) {
                    return new Promise((resolve, reject) => {
                        serverFunctions
                            .initRpcServer({ rpcServer: rpcServer })
                            .then(resolve)
                            .catch(reject)
                    });
                }
                else {
                    return new Promise((resolve, reject) => {
                        functions
                            .httpsCallable('initRpcServer')({ rpcServer: rpcServer })
                            .then((res) => resolve(res.data))
                            .catch(reject)
                    });
                }
            },
            callContractReadMethod: function(contract, method, options, params, rpcServer) {
                if (_isLocalNetwork()) {
                    return new Promise((resolve, reject) => {
                        serverFunctions
                            .callContractReadMethod({ contract: contract, method: method, options: options, params: params, rpcServer: rpcServer })
                            .then(resolve)
                            .catch(reject)
                    });
                }
                else {
                    return new Promise((resolve, reject) => {
                        functions
                            .httpsCallable('callContractReadMethod')({ contract: contract, method: method, options: options, params: params, rpcServer: rpcServer })
                            .then((res) => resolve(res.data))
                            .catch(reject)
                    });
                }
            },
            callContractWriteMethod: function(contract, method, options, params, rpcServer) {
                if (_isLocalNetwork()) {
                    return new Promise((resolve, reject) => {
                        serverFunctions
                            .callContractWriteMethod({ contract: contract, method: method, options: options, params: params, rpcServer: rpcServer })
                            .then(resolve)
                            .catch(reject)
                    });
                }
                else {
                    return new Promise((resolve, reject) => {
                        functions
                            .httpsCallable('callContractWriteMethod')({ contract: contract, method: method, options: options, params: params, rpcServer: rpcServer })
                            .then((res) => resolve(res.data))
                            .catch(reject)
                    });
                }
            },
            getStructure: function(contract, rpcServer, dependenciesArtifact) {
                if (_isLocalNetwork()) {
                    return new Promise((resolve, reject) => {
                        serverFunctions
                            .getStructure({ contract: contract, rpcServer: rpcServer, dependenciesArtifact: dependenciesArtifact })
                            .then(resolve)
                            .catch(reject)
                    });
                }
                else {
                    return new Promise((resolve, reject) => {
                        functions
                            .httpsCallable('getStructure')({ contract: contract, rpcServer: rpcServer, dependenciesArtifact: dependenciesArtifact })
                            .then((res) => resolve(res.data))
                            .catch(reject)
                    });
                }
            },
            decodeData: function(contract, rpcServer, blockNumber) {
                if (_isLocalNetwork()) {
                    return new Promise((resolve, reject) => {
                        serverFunctions
                            .decodeData({ contract: contract, rpcServer: rpcServer, blockNumber: blockNumber })
                            .then(resolve)
                            .catch(reject)
                    });
                }
                else {
                    return new Promise((resolve, reject) => {
                        functions
                            .httpsCallable('decodeData')({ contract: contract, rpcServer: rpcServer, blockNumber: blockNumber })
                            .then((res) => resolve(res.data))
                            .catch(reject)
                    });
                }
            }
        };
    }
};
