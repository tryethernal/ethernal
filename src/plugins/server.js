import { ethers } from 'ethers';
const Web3 = require('web3');
const Decoder = require('@truffle/decoder');
const axios = require('axios');

import { Storage } from '../lib/storage';
import { functions } from './firebase';
import { sanitize } from '../lib/utils';
import { parseTrace } from '../lib/trace';
import { isErc20 } from '../lib/contract';

const serverFunctions = {
    // Private
    _getDependenciesArtifact: function(contract) {
        return contract.dependencies ? Object.entries(contract.dependencies).map(dep => dep[1]) : [];
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
        let provider;
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
        let provider;
        if (rpcServer.protocol == 'http:' || rpcServer.protocol == 'https:') {
            provider = ethers.providers.JsonRpcProvider;
        }
        else if (rpcServer.protocol == 'ws:' || rpcServer.protocol == 'wss:') {
            provider = ethers.providers.WebSocketProvider;
        }

        return new provider(url);
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
            if (contract.abi && !isErc20(contract.abi)) tokenPatterns.push('proxy');

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
    getRpcAccounts: async function(data) {
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
                console.log(data.options.pkey)
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

            return pendingTx;
        } catch(error) {
            console.log(error)
            const parsedError = JSON.parse(JSON.stringify(error));

            let errorData;
            if (parsedError.error) {
                console.log(parsedError.error)
                if (parsedError.error.data)
                    errorData = parsedError.error.data;
                else if (parsedError.error.error && parsedError.error.error.data)
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
    },
    getBalanceChanges: async function(account, token, block, rpcServer) {
        let currentBalance = ethers.BigNumber.from('0');
        let previousBalance = ethers.BigNumber.from('0');

        const contract = { address: token, abi : ['function balanceOf(address owner) view returns (uint256)'] };
        const previsouBlockNumber = Math.max(0, parseInt(block) - 1);

        try {
            const res = await serverFunctions.callContractReadMethod({
                contract: contract,
                method: 'balanceOf(address)',
                options: { from: null, blockTag: block },
                params: { 0: account },
                rpcServer: rpcServer
            })
            if (ethers.BigNumber.isBigNumber(res[0]))
                currentBalance = res[0];
            else
                throw 'Not a big number result'
        } catch(_error) {/* */}

        if (block > 1) {
            try {
                const res = await serverFunctions.callContractReadMethod({
                    contract: contract,
                    method: 'balanceOf(address)',
                    options: { from: null, blockTag: previsouBlockNumber},
                    params: { 0: account },
                    rpcServer: rpcServer
                });

                if (ethers.BigNumber.isBigNumber(res[0]))
                    previousBalance = res[0];
                else
                    throw 'Not a big number result'
            } catch(_error) {/* */}
        }

        return {
            address: account,
            currentBalance: currentBalance.toString(),
            previousBalance: previousBalance.toString(),
            diff: currentBalance.sub(previousBalance).toString()
        };
    },
    fetchErrorData: async function(transaction, rpcServer) {
        try {
            const provider = serverFunctions._getProvider(rpcServer);
            const res = await provider.call({ to: transaction.to, data: transaction.data }, transaction.blockNumber);
            return ethers.utils.toUtf8String('0x' + res.substr(138));
        } catch(error) {
            if (error.response) {
                const parsed = JSON.parse(error.response);
                if (parsed.error && parsed.error.message)
                    return { parsed: true, message: parsed.error.message };
                else
                    return { parsed: false, message: parsed };
            }
            else
                return { parsed: false, message: error }
        }
    }
};

export const serverPlugin = {
    install(Vue, options) {
        const store = options.store;

        const _rpcServer = function() {
            return store.getters.currentWorkspace.rpcServer;
        };

        Vue.prototype.server = {
            setRemoteFlag() {
                const data = {
                    firebaseAuthToken: store.getters.firebaseIdToken,
                    firebaseUserId: store.getters.currentWorkspace.firebaseUserId,
                    workspace: store.getters.currentWorkspace.name,
                };
                const resource = `${process.env.VUE_APP_API_ROOT}/api/marketing/setRemoteFlag`;
                return axios.post(resource, { data });
            },

            submitExplorerLead(email) {
                const data = {
                    firebaseAuthToken: store.getters.firebaseIdToken,
                    firebaseUserId: store.getters.currentWorkspace.firebaseUserId,
                    workspace: store.getters.currentWorkspace.name,
                    email: email,
                };
                const resource = `${process.env.VUE_APP_API_ROOT}/api/marketing/submitExplorerLead`;
                return axios.post(resource, { data });
            },

            getMarketingFlags() {
                const params = {
                    firebaseAuthToken: store.getters.firebaseIdToken,
                    firebaseUserId: store.getters.currentWorkspace.firebaseUserId,
                    workspace: store.getters.currentWorkspace.name,
                };
                const resource = `${process.env.VUE_APP_API_ROOT}/api/marketing`;
                return axios.get(resource, { params });
            },

            verifyContract(address, data) {
                const resource = `${process.env.VUE_APP_API_ROOT}/api/contracts/${address}/verify`;
                return axios.post(resource, data);
            },

            getWalletVolume(from, to) {
                const params = {
                    firebaseAuthToken: store.getters.firebaseIdToken,
                    firebaseUserId: store.getters.currentWorkspace.firebaseUserId,
                    workspace: store.getters.currentWorkspace.name,
                    from: from,
                    to: to
                };
                const resource = `${process.env.VUE_APP_API_ROOT}/api/stats/wallets`;
                return axios.get(resource, { params });
            },

            getTransactionVolume(from, to) {
                const params = {
                    firebaseAuthToken: store.getters.firebaseIdToken,
                    firebaseUserId: store.getters.currentWorkspace.firebaseUserId,
                    workspace: store.getters.currentWorkspace.name,
                    from: from,
                    to: to
                };
                const resource = `${process.env.VUE_APP_API_ROOT}/api/stats/transactions`;
                return axios.get(resource, { params });
            },

            getGlobalStats() {
                const params = {
                    firebaseAuthToken: store.getters.firebaseIdToken,
                    firebaseUserId: store.getters.currentWorkspace.firebaseUserId,
                    workspace: store.getters.currentWorkspace.name,
                };
                const resource = `${process.env.VUE_APP_API_ROOT}/api/stats/global`;
                return axios.get(resource, { params });
            },

            getTokenBalances(address) {
                const params = {
                    firebaseAuthToken: store.getters.firebaseIdToken,
                    firebaseUserId: store.getters.currentWorkspace.firebaseUserId,
                    workspace: store.getters.currentWorkspace.name,
                };
                const resource = `${process.env.VUE_APP_API_ROOT}/api/addresses/${address}/balances`;
                return axios.get(resource, { params });
            },

            search(type, query) {
                const params = {
                    firebaseAuthToken: store.getters.firebaseIdToken,
                    firebaseUserId: store.getters.currentWorkspace.firebaseUserId,
                    workspace: store.getters.currentWorkspace.name,
                    type: type,
                    query: query
                };

                const resource = `${process.env.VUE_APP_API_ROOT}/api/search`;
                return axios.get(resource, { params });
            },

            getBlocks(options) {
                const params = {
                    firebaseAuthToken: store.getters.firebaseIdToken,
                    firebaseUserId: store.getters.currentWorkspace.firebaseUserId,
                    workspace: store.getters.currentWorkspace.name,
                    ...options
                };
                const resource = `${process.env.VUE_APP_API_ROOT}/api/blocks`;
                return axios.get(resource, { params });
            },

            getBlock(number, withTransactions = true) {
                const params = {
                    firebaseAuthToken: store.getters.firebaseIdToken,
                    firebaseUserId: store.getters.currentWorkspace.firebaseUserId,
                    workspace: store.getters.currentWorkspace.name,
                    withTransactions: withTransactions
                };
                const resource = `${process.env.VUE_APP_API_ROOT}/api/blocks/${number}`;
                return axios.get(resource, { params });
            },

            getTransactions(options) {
                const params = {
                    firebaseAuthToken: store.getters.firebaseIdToken,
                    firebaseUserId: store.getters.currentWorkspace.firebaseUserId,
                    workspace: store.getters.currentWorkspace.name,
                    ...options
                };
                const resource = `${process.env.VUE_APP_API_ROOT}/api/transactions`;
                return axios.get(resource, { params });
            },

            getTransaction(hash) {
                const params = {
                    firebaseAuthToken: store.getters.firebaseIdToken,
                    firebaseUserId: store.getters.currentWorkspace.firebaseUserId,
                    workspace: store.getters.currentWorkspace.name,
                };
                const resource = `${process.env.VUE_APP_API_ROOT}/api/transactions/${hash}`;
                return axios.get(resource, { params });
            },

            getContracts(options) {
                const params = {
                    firebaseAuthToken: store.getters.firebaseIdToken,
                    firebaseUserId: store.getters.currentWorkspace.firebaseUserId,
                    workspace: store.getters.currentWorkspace.name,
                    ...options
                };
                const resource = `${process.env.VUE_APP_API_ROOT}/api/contracts`;
                return axios.get(resource, { params });
            },

            getContract(address) {
                const params = {
                    firebaseAuthToken: store.getters.firebaseIdToken,
                    firebaseUserId: store.getters.currentWorkspace.firebaseUserId,
                    workspace: store.getters.currentWorkspace.name,
                };
                const resource = `${process.env.VUE_APP_API_ROOT}/api/contracts/${address}`;
                return axios.get(resource, { params });
            },

            getAddressTransactions(address, options) {
                const params = {
                    firebaseAuthToken: store.getters.firebaseIdToken,
                    firebaseUserId: store.getters.currentWorkspace.firebaseUserId,
                    workspace: store.getters.currentWorkspace.name,
                    ...options
                };
                const resource = `${process.env.VUE_APP_API_ROOT}/api/addresses/${address}/transactions`;
                return axios.get(resource, { params });
            },

            getAccounts(options) {
                const params = {
                    firebaseAuthToken: store.getters.firebaseIdToken,
                    firebaseUserId: store.getters.currentWorkspace.firebaseUserId,
                    workspace: store.getters.currentWorkspace.name,
                    ...options
                };
                const resource = `${process.env.VUE_APP_API_ROOT}/api/accounts`;
                return axios.get(resource, { params });
            },

            getCurrentUser() {
                const params = {
                    firebaseAuthToken: store.getters.firebaseIdToken,
                    firebaseUserId: store.getters.currentWorkspace.firebaseUserId
                };
                const resource = `${process.env.VUE_APP_API_ROOT}/api/users/me`;
                return axios.get(resource, { params });
            },

            // setCurrentWorkspace(workspace) {
            //     const data = {
            //         firebaseAuthToken: store.getters.firebaseIdToken,
            //         firebaseUserId: store.getters.currentWorkspace.firebaseUserId,
            //         workspace: workspace
            //     };
            //     const resource = `${process.env.VUE_APP_API_ROOT}/api/users/me/setCurrentWorkspace`;
            //     return axios.post(resource, { data });
            // },

            getPublicExplorerByDomain(domain) {
                const params = {
                    domain: domain
                };
                const resource = `${process.env.VUE_APP_API_ROOT}/api/explorers`;
                return axios.get(resource, { params });
            },

            getPublicExplorerBySlug(slug) {
                const params = {
                    slug: slug
                };
                const resource = `${process.env.VUE_APP_API_ROOT}/api/explorers`;
                return axios.get(resource, { params });
            },

            getProcessableTransactions() {
                const params = {
                    firebaseAuthToken: store.getters.firebaseIdToken,
                    firebaseUserId: store.getters.currentWorkspace.firebaseUserId,
                    workspace: store.getters.currentWorkspace.name
                };
                const resource = `${process.env.VUE_APP_API_ROOT}/api/transactions/processable`;
                return axios.get(resource, { params });
            },

            getFailedProcessableTransactions() {
                const params = {
                    firebaseAuthToken: store.getters.firebaseIdToken,
                    firebaseUserId: store.getters.currentWorkspace.firebaseUserId,
                    workspace: store.getters.currentWorkspace.name
                };
                const resource = `${process.env.VUE_APP_API_ROOT}/api/transactions/failedProcessable`;
                return axios.get(resource, { params });
            },

            // createWorkspace(name, workspaceData) {
            //     const data = {
            //         firebaseAuthToken: store.getters.firebaseIdToken,
            //         firebaseUserId: store.getters.currentWorkspace.firebaseUserId,
            //         data: {
            //             name: name,
            //             workspaceData: workspaceData
            //         }
            //     };
            //     const resource = `${process.env.VUE_APP_API_ROOT}/api/workspaces`;
            //     return axios.post(resource, { data });
            // },

            getWorkspaces() {
                const params = {
                    firebaseAuthToken: store.getters.firebaseIdToken,
                    firebaseUserId: store.getters.currentWorkspace.firebaseUserId
                };

                const resource = `${process.env.VUE_APP_API_ROOT}/api/workspaces`;
                return axios.get(resource, { params });
            },

            syncBalance(address, balance) {
                const data = {
                    firebaseAuthToken: store.getters.firebaseIdToken,
                    firebaseUserId: store.getters.currentWorkspace.firebaseUserId,
                    workspace: store.getters.currentWorkspace.name,
                    balance: balance
                };

                const resource = `${process.env.VUE_APP_API_ROOT}/api/accounts/${address}/syncBalance`;
                return axios.post(resource, { data });
            },

            createStripeCheckoutSession(plan) {
                const data = {
                    firebaseAuthToken: store.getters.firebaseIdToken,
                    firebaseUserId: store.getters.currentWorkspace.firebaseUserId,
                    plan: plan
                };

                const resource = `${process.env.VUE_APP_API_ROOT}/api/stripe/createCheckoutSession`;
                return axios.post(resource, { data });
            },

            createStripePortalSession() {
                const data = {
                    firebaseAuthToken: store.getters.firebaseIdToken,
                    firebaseUserId: store.getters.currentWorkspace.firebaseUserId
                };

                const resource = `${process.env.VUE_APP_API_ROOT}/api/stripe/createPortalSession`;
                return axios.post(resource, { data });
            },

            setCurrentWorkspace: function(workspace) {
                return functions.httpsCallable('setCurrentWorkspace')({ name: workspace });
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
            processTransaction: function(workspace, transactionHash) {
                return functions.httpsCallable('processTransaction')({ workspace: workspace, transaction: transactionHash });
            },
            removeContract: function(workspace, address) {
                return functions.httpsCallable('removeContract')({ workspace: workspace, address: address });
            },
            resetWorkspace: function(name) {
                return functions.httpsCallable('resetWorkspace')({ workspace: name })
            },
            updateWorkspaceSettings: function(workspace, settings) {
                return functions.httpsCallable('updateWorkspaceSettings')({ workspace: workspace, settings: settings });
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
            processFailedTransactions: async function(transactions, workspace) {
                 try {
                    for (let i = 0; i < transactions.length; i++) {
                        const transaction = transactions[i];

                        if (transaction.receipt.status === 0 || transaction.receipt.status === false) {
                            serverFunctions.fetchErrorData(transaction, workspace.rpcServer)
                                .then((result) => {
                                    return functions.httpsCallable('syncFailedTransactionError')({ workspace: workspace.name, transaction: transaction.hash, error: result });
                                })
                                .catch(console.log);
                        }
                    }
                } catch(error) {
                    console.log(error);
                    var reason = error.reason || error.message || "Can't connect to the server";
                    throw { reason: reason };
                }
            },
            processTransactions: async function(workspace, transactions) {
                try {
                    for (let i = 0; i < transactions.length; i++) {
                        const transaction = transactions[i];

                        const tokenBalanceChanges = {};
                        for (let j = 0; j < transaction.tokenTransfers.length; j++) {
                            const transfer = transaction.tokenTransfers[j];
                            const changes = [];
                            if (transfer.src != '0x0000000000000000000000000000000000000000') {
                                const balanceChange = await serverFunctions.getBalanceChanges(transfer.src, transfer.token, transaction.blockNumber, workspace.rpcServer);
                                if (balanceChange)
                                    changes.push(balanceChange);
                            }
                            if (transfer.dst != '0x0000000000000000000000000000000000000000') {
                                const balanceChange = await serverFunctions.getBalanceChanges(transfer.dst, transfer.token, transaction.blockNumber, workspace.rpcServer);
                                if (balanceChange)
                                    changes.push(balanceChange);
                            }

                            if (changes.length > 0)
                                tokenBalanceChanges[transfer.token] = changes;
                        }

                        if (Object.keys(tokenBalanceChanges).length)
                            functions.httpsCallable('syncTokenBalanceChanges')({ workspace: workspace.name, transaction: transaction.hash, tokenBalanceChanges: tokenBalanceChanges });
                    }
                } catch(error) {
                    console.log(error);
                    var reason = error.reason || error.message || "Can't connect to the server";
                    throw { reason: reason };
                }
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
                        console.log(networkId)
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
            getRpcAccounts: function(rpcServer) {
                return new Promise((resolve, reject) => {
                    serverFunctions
                        .getRpcAccounts({ rpcServer: rpcServer })
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
