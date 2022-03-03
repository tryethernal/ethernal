import { ethers } from 'ethers';
const Web3 = require('web3');
const Decoder = require('@truffle/decoder');

import { Storage } from '../lib/storage';
import { functions } from './firebase';
import { sanitize } from '../lib/utils';
import { parseTrace } from '../lib/trace';
import { isErc20 } from '../lib/contract';

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
    _fetchTokenInfo: async function(contract, rpcServer) {
        let decimals = [], symbol = [], name = [];
        try {
            const ERC20_ABI = [
                {"name":"name", "constant":true, "payable":false, "type":"function", "inputs":[], "outputs":[{"name":"","type":"string"}]},
                {"name":"symbol", "constant":true, "payable":false, "type":"function", "inputs":[], "outputs":[{"name":"","type":"string"}]},
                {"name":"decimals", "constant":true, "payable":false, "type":"function", "inputs":[], "outputs":[{"name":"","type":"uint8"}]}
            ];
            const tmpContract = {
                ...contract,
                abi: ERC20_ABI
            };
            decimals = await serverFunctions.callContractReadMethod({ contract: tmpContract, method: 'decimals()', options: {}, params: {}, rpcServer: rpcServer });
            symbol = await serverFunctions.callContractReadMethod({ contract: tmpContract, method: 'symbol()', options: {}, params: {}, rpcServer: rpcServer });
            name = await serverFunctions.callContractReadMethod({ contract: tmpContract, method: 'name()', options: {}, params: {}, rpcServer: rpcServer });
        } catch (error) {
            if (error.reason == 'missing response')
                throw "Can't connect to the server";
        }

        if (!decimals.length || !symbol.length || !name.length) {
            return {};
        }
        else {
            const tokenPatterns = ['erc20'];
            if (!isErc20(contract.abi)) tokenPatterns.push('proxy');

            return {
                patterns: tokenPatterns,
                properties: {
                    decimals: decimals[0],
                    symbol: symbol[0],
                    name: name[0]
                }
            };
        }
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
            const accounts = await rpcProvider.listAccounts();
            return accounts.map((acc) => acc.toLowerCase());
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
            var gasLimit = latestBlock.gasLimit.toString();

            var workspace = {
                rpcServer: data.rpcServer,
                networkId: networkId,
                settings: {
                    gasLimit: gasLimit
                }
            };

            return workspace;
        } catch(error) {
            console.log(error);
            const reason = error.body ? JSON.parse(error.body).error.message : error.reason || error.message || "Can't connect to the server";
            throw { reason: reason };
        }
    },
    callContractReadMethod: async function(data) {
        try {
            var provider = data.provider ? new ethers.providers.Web3Provider(data.provider, 'any') : serverFunctions._getProvider(data.rpcServer);
            var signer;
            var options = sanitize({
                gasLimit: data.options.gasLimit || 100000,
                gasPrice: data.options.gasPrice,
                blockTag: data.options.blockTag
            });

            if (data.options.pkey) {
                signer = new ethers.Wallet(data.options.pkey, provider);
            }
            else {
                signer = provider.getSigner(data.options.from);
            }

            var contract = new ethers.Contract(data.contract.address, data.contract.abi, signer);
            return await contract.functions[data.method](...Object.values(data.params), options);
        } catch(error) {
            console.log(error)
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

            let trace = null;

            if (data.shouldTrace)
                trace = await serverFunctions.traceTransaction(data.rpcServer, pendingTx.hash);

            return sanitize({
                pendingTx: pendingTx,
                trace: trace
            });
        } catch(error) {
            const parsedError = JSON.parse(JSON.stringify(error));

            let errorData;
            if (parsedError.error) {
                console.log(parsedError.error)
                if (parsedError.error.data)
                    errorData = parsedError.error.data;
                else if (parsedError.error.error.data)
                    errorData = parsedError.error.error.data;
            }

            const reason = error.body ? JSON.parse(error.body).error.message : error.reason || error.message || "Can't connect to the server";
            if (reason == 'invalid hexlify value')
                throw { reason: `Invalid private key format for ${data.options.from}. Please correct it in the "Accounts" page` };
            else
                throw sanitize({ reason: reason, data: errorData });
        }
    },
    traceTransaction: async function(rpcServer, hash) {
        try {
            const rpcProvider = new serverFunctions._getProvider(rpcServer);
            const transaction = await rpcProvider.getTransaction(hash);
            const trace = await rpcProvider.send('debug_traceTransaction', [hash, {}]).catch(() => null);

            if (trace)
                return await parseTrace(transaction.to, trace, rpcProvider);
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
    },
    processContracts: async function(data) {
        try {
            const contracts = (await functions.httpsCallable('getUnprocessedContracts')({ workspace: data.workspace })).data.contracts;
            for (let i = 0; i < contracts.length; i++) {
                const contract = contracts[i];
                const token = await serverFunctions._fetchTokenInfo(contract, data.rpcServer);
                await functions.httpsCallable('setTokenProperties')({
                    workspace: data.workspace,
                    contract: contract.address,
                    tokenProperties: token.properties,
                    tokenPatterns: token.patterns
                });
            }

            return true;
        } catch(error) {
            console.log(error);
            var reason = error.reason || error.message || "Can't connect to the server";
            throw { reason: reason };
        }
    }
};

export const serverPlugin = {
    install(Vue, options) {
        var store = options.store;

        var _rpcServer = function() {
            return store.getters.currentWorkspace.rpcServer;
        };

        Vue.prototype.server = {
            storeTransactionBalanceChange: function(workspace, transactionHash, tokenBalanceChange) {
                return functions.httpsCallable('storeTransactionBalanceChange')({ workspace: workspace, transactionHash: transactionHash, tokenBalanceChange: tokenBalanceChange });
            },
            getProductRoadToken: function() {
                return functions.httpsCallable('getProductRoadToken')();
            },
            createUser: function(uid) {
                return functions.httpsCallable('createUser')({ uid: uid });
            },
            syncTransactionData: function(workspace, hash, data) {
                return functions.httpsCallable('syncTransactionData')({ workspace: workspace, hash: hash, data: data });
            },
            removeContract: function(workspace, address) {
                return functions.httpsCallable('removeContract')({ workspace: workspace, address: address });
            },
            createStripePortalSession: function() {
                return functions.httpsCallable('createStripePortalSession')();
            },
            createStripeCheckoutSession: function(plan) {
                return functions.httpsCallable('createStripeCheckoutSession')({ plan: plan });
            },
            resetWorkspace: function(name) {
                return functions.httpsCallable('resetWorkspace')({ workspace: name })
            },
            updateWorkspaceSettings: function(workspace, settings) {
                return functions.httpsCallable('updateWorkspaceSettings')({ workspace: workspace, settings: settings });
            },
            setCurrentWorkspace: function(name) {
                return functions.httpsCallable('setCurrentWorkspace')({ name: name });
            },
            syncBalance: function(workspace, account, balance) {
                return functions.httpsCallable('syncBalance')({ workspace: workspace, account: account, balance: balance });
            },
            createWorkspace: function(name, data) {
                return functions.httpsCallable('createWorkspace')({ name: name, workspaceData: data });
            },
            syncContractData: function(workspace, address, name, abi, watchedPaths) {
                return functions.httpsCallable('syncContractData')({ workspace: workspace, address: address, name: name, abi: abi, watchedPaths: watchedPaths });
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
            importContract: function(workspace, contractAddress) {
                return functions.httpsCallable('importContract')({ workspace: workspace, contractAddress: contractAddress });
            },
            getWorkspaceApiToken: function(workspace) {
                return functions.httpsCallable('getWorkspaceApiToken')({ workspace: workspace });
            },
            enableWorkspaceApi: function(workspace) {
                return functions.httpsCallable('enableWorkspaceApi')({ workspace: workspace });
            },
            disableWorkspaceApi: function(workspace) {
                return functions.httpsCallable('disableWorkspaceApi')({ workspace: workspace });
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
            processContracts: async function(workspace) {
                return new Promise((resolve, reject) => {
                    serverFunctions.processContracts({ workspace: workspace, rpcServer: _rpcServer() })
                        .then(resolve)
                        .catch(reject);
                });
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
                return new Promise((resolve, reject) => {
                    serverFunctions
                        .impersonateAccount({ rpcServer: rpcServer, accountAddress: accountAddress })
                        .then(resolve)
                        .catch(reject)
                });
            },
            getAccounts: function() {
                return new Promise((resolve, reject) => {
                    serverFunctions
                        .getAccounts({ rpcServer: _rpcServer() })
                        .then(resolve)
                        .catch(reject)
                });
            },
            getAccountBalance: function(account) {
                return new Promise((resolve, reject) => {
                    serverFunctions
                        .getAccountBalance({ rpcServer: _rpcServer(), account: account })
                        .then(resolve)
                        .catch(reject)
                });
            },
            initRpcServer: function(rpcServer) {
                return new Promise((resolve, reject) => {
                    serverFunctions
                        .initRpcServer({ rpcServer: rpcServer })
                        .then(resolve)
                        .catch(reject)
                });
            },
            callContractReadMethod: function(contract, method, options, params, rpcServer, provider) {
                return new Promise((resolve, reject) => {
                    serverFunctions
                        .callContractReadMethod({ contract: contract, method: method, options: options, params: params, rpcServer: rpcServer, provider: provider })
                        .then(resolve)
                        .catch(reject)
                });
            },
            callContractWriteMethod: function(contract, method, options, params, rpcServer, shouldTrace) {
                return new Promise((resolve, reject) => {
                    serverFunctions
                        .callContractWriteMethod({ contract: contract, method: method, options: options, params: params, rpcServer: rpcServer, shouldTrace: shouldTrace })
                        .then(resolve)
                        .catch(reject)
                });
            },
            getStructure: function(contract, rpcServer, dependenciesArtifact) {
                return new Promise((resolve, reject) => {
                    serverFunctions
                        .getStructure({ contract: contract, rpcServer: rpcServer, dependenciesArtifact: dependenciesArtifact })
                        .then(resolve)
                        .catch(reject)
                });
            },
            decodeData: function(contract, rpcServer, blockNumber) {
                return new Promise((resolve, reject) => {
                    serverFunctions
                        .decodeData({ contract: contract, rpcServer: rpcServer, blockNumber: blockNumber })
                        .then(resolve)
                        .catch(reject)
                });
            }
        };
    }
};
