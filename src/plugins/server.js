import { ethers } from 'ethers';
import { storeToRefs } from 'pinia';
import { useEnvStore } from '../stores/env';
import { useUserStore } from '../stores/user';
import { useCurrentWorkspaceStore } from '../stores/currentWorkspace';
import { useExplorerStore } from '../stores/explorer';
const Web3 = require('web3');
const Axios = require('axios');
let setupCache;
const DEBUG_AXIOS_CACHE_INTERCEPTOR = false;
if (import.meta.env.NODE_ENV == 'development' && DEBUG_AXIOS_CACHE_INTERCEPTOR)
    ({ setupCache } = require('axios-cache-interceptor/dev'));
else
    ({ setupCache } = require('axios-cache-interceptor'));

const axios = setupCache(Axios, {
    debug: console.log,
    ttl: 0
});
const CACHE_TTL = 2000;

import { sanitize } from '../lib/utils';
import { parseTrace } from '../lib/trace';
import { findPatterns, formatErc721Metadata } from '../lib/contract';
import { ERC721Connector } from '../lib/rpc';

const serverFunctions = {
    // Private
    _getWeb3Provider: function(url) {
        const rpcServer = new URL(url);

        let provider;
        if (rpcServer.protocol == 'http:' || rpcServer.protocol == 'https:') {
            provider = Web3.providers.HttpProvider;
        }
        else if (rpcServer.protocol == 'ws:' || rpcServer.protocol == 'wss:') {
            provider = Web3.providers.WebsocketProvider;
        }

        let options = {};
        if (rpcServer.username.length || rpcServer.password.length) {
            const base64Credentials = btoa(`${rpcServer.username}:${rpcServer.password}`);
            options.headers = [
                { name: 'Authorization', value: `Basic ${base64Credentials}` }
            ];
        }

        return new provider(`${rpcServer.origin}${rpcServer.pathname}${rpcServer.search}`, options);
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

        let authenticatedUrl = url;
        if (rpcServer.username.length || rpcServer.password.length)
            authenticatedUrl = {
                url: rpcServer.origin,
                user: rpcServer.username,
                password: rpcServer.password
            };

        return new provider(authenticatedUrl);
    },

    // Public
    getStructure: async function(data) {
        try {
            var structure = await serverFunctions._buildStructure(data.contract, data.rpcServer, data.contract.ast.dependencies);
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
            return accounts.map(acc => acc.toLowerCase());
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
            const rpcProvider = serverFunctions._getProvider(data.rpcServer);

            // We use web3 here, because for some reason ethers.js doesn't thrown an error if it can't connect to the rpc server
            const web3Provider = new Web3(serverFunctions._getWeb3Provider(data.rpcServer));
            const chainId = await web3Provider.eth.net.getId()
            var latestBlockNumber = await rpcProvider.getBlockNumber();
            var latestBlock = await rpcProvider.getBlock(latestBlockNumber);
            var gasLimit = latestBlock.gasLimit.toString();

            var workspace = {
                rpcServer: data.rpcServer,
                networkId: chainId,
                settings: {
                    gasLimit: gasLimit
                }
            };

            return workspace;
        } catch(error) {
            const reason = error.body ? JSON.parse(error.body).error.message : error.reason || error.message || null;
            if (reason)
                throw new Error(reason);
            else
                throw error;
        }
    },
    callContractReadMethod: async function(data) {
        try {
            var provider = data.provider ? new ethers.providers.Web3Provider(data.provider, 'any') : serverFunctions._getProvider(data.rpcServer);
            var signer;
            var options = sanitize({
                gasLimit: data.options.gasLimit,
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
            const provider = serverFunctions._getProvider(data.rpcServer);
            let signer;
            const options = sanitize({
                gasLimit: data.options.gasLimit,
                gasPrice: data.options.gasPrice,
                value: data.options.value,
            });
            if (data.options.privateKey) {
                // Bad hack due to some issue in how we use the crypto library that result in some junk being appended to the decrypted pk
                const slicedKey = data.options.privateKey.startsWith('0x') ? data.options.privateKey.slice(0, 68) : data.options.privateKey.slice(0, 66);
                signer = new ethers.Wallet(slicedKey, provider);
            }
            else {
                signer = provider.getSigner(data.options.from);
            }
            const contract = new ethers.Contract(data.contract.address, data.contract.abi, signer);

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
    transferErc721Token(rpcServer, contractAddress, from, to, tokenId) {
        const erc721Connector = new ERC721Connector(rpcServer, contractAddress);
        return erc721Connector.safeTransferFrom(from, to, tokenId);

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
    async impersonateAccount(data) {
        try {
            const rpcProvider = new serverFunctions._getProvider(data.rpcServer)
            try {
                await rpcProvider.send('hardhat_impersonateAccount', [data.accountAddress]);
                return true;
            } catch(error) {
                console.log(error);
                await rpcProvider.send('evm_unlockUnknownAccount', [data.accountAddress]).catch(console.log);
                return true;
            }
        } catch(error) {
            console.log(error);
            const reason = error.body ? JSON.parse(error.body).error.message : error.reason || error.message || "Can't connect to the server";
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
                currentBalance = ethers.BigNumber.from('0')
        } catch(_error) {
            currentBalance = ethers.BigNumber.from('0')
        }

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
                    previousBalance = ethers.BigNumber.from('0');
            } catch(_error) {
                previousBalance = ethers.BigNumber.from('0');
            }
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
            const res = await provider.call({
                from: transaction.from,
                to: transaction.to,
                data: transaction.data,
                gasPrice: transaction.gasPrice,
                gasLimit: transaction.gasLimit,
                value: transaction.value
            }, transaction.blockNumber);

            return {
                parsed: true,
                message: ethers.utils.toUtf8String('0x' + res.substr(138))
            };
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

export default {
    install(app) {
        const envStore = useEnvStore();
        const currentWorkspaceStore = useCurrentWorkspaceStore();
        const explorerStore = useExplorerStore();
        const userStore = useUserStore();

        const { firebaseUserId } = storeToRefs(userStore);
        const { name: workspace } = storeToRefs(currentWorkspaceStore);

        const _rpcServer = function() {
            return storeToRefs(currentWorkspaceStore).rpcServer.value;
        };

        axios.interceptors.request.use(
            config => {
                const apiToken = localStorage.getItem('ssoApiToken') || localStorage.getItem('apiToken');
                if (apiToken)
                    config.headers['Authorization'] = `Bearer ${apiToken}`;
                return config;
            }
        );

        const $server = {
            getBlockSizeHistory(from, to) {
                const params = {
                    firebaseUserId: firebaseUserId.value,
                    workspace: workspace.value,
                    from,
                    to
                }
                const resource = `${envStore.apiRoot}/api/stats/blockSizeHistory`;
                return axios.get(resource, { params });
            },

            getBlockTimeHistory(from, to) {
                const params = {
                    firebaseUserId: firebaseUserId.value,
                    workspace: workspace.value,
                    from,
                    to
                }
                const resource = `${envStore.apiRoot}/api/stats/blockTimeHistory`;
                return axios.get(resource, { params });
            },

            getLatestGasSpenders(intervalInHours = 24) {
                const params = {
                    firebaseUserId: firebaseUserId.value,
                    workspace: workspace.value,
                    intervalInHours
                }
                const resource = `${envStore.apiRoot}/api/gas/spenders`;
                return axios.get(resource, { params });
            },

            getLatestGasConsumers(intervalInHours = 24) {
                const params = {
                    firebaseUserId: firebaseUserId.value,
                    workspace: workspace.value,
                    intervalInHours
                }
                const resource = `${envStore.apiRoot}/api/gas/consumers`;
                return axios.get(resource, { params });
            },

            getGasUtilizationRatioHistory(from, to) {
                const params = {
                    firebaseUserId: firebaseUserId.value,
                    workspace: workspace.value,
                    from,
                    to
                }
                const resource = `${envStore.apiRoot}/api/gas/utilizationRatioHistory`;
                return axios.get(resource, { params });
            },

            getGasLimitHistory(from, to) {
                const params = {
                    firebaseUserId: firebaseUserId.value,
                    workspace: workspace.value,
                    from,
                    to
                }
                const resource = `${envStore.apiRoot}/api/gas/limitHistory`;
                return axios.get(resource, { params });
            },

            getGasPriceHistory(from, to) {
                const params = {
                    firebaseUserId: firebaseUserId.value,
                    workspace: workspace.value,
                    from,
                    to
                }
                const resource = `${envStore.apiRoot}/api/gas/priceHistory`;
                return axios.get(resource, { params });
            },

            getLatestGasStats(intervalInMinutes = 1) {
                const params = {
                    firebaseUserId: firebaseUserId.value,
                    workspace: workspace.value,
                    intervalInMinutes
                }
                const resource = `${envStore.apiRoot}/api/gas/stats`;
                return axios.get(resource, { params });
            },

            searchExplorer(domain) {
                const resource = `${envStore.apiRoot}/api/explorers/search`;
                return axios.get(resource, { params: { domain }});
            },

            getV2DexStatus(id) {
                const resource = `${envStore.apiRoot}/api/v2_dexes/${id}/status`;
                return axios.get(resource);
            },

            getNativeTokenBalance(address) {
                const params = { firebaseUserId: firebaseUserId.value, workspace: workspace.value, };

                const resource = `${envStore.apiRoot}/api/addresses/${address}/nativeTokenBalance`;
                return axios.get(resource, { params });
            },

            deleteV2Dex(id) {
                const resource = `${envStore.apiRoot}/api/v2_dexes/${id}`;
                return axios.delete(resource);
            },

            activateV2Dex(id) {
                const resource = `${envStore.apiRoot}/api/v2_dexes/${id}/activate`;
                return axios.put(resource);
            },

            deactivateV2Dex(id) {
                const resource = `${envStore.apiRoot}/api/v2_dexes/${id}/deactivate`;
                return axios.put(resource);
            },

            getLatestPairsWithReserve(options) {
                const id = explorerStore.v2Dex.id;
                const resource = `${envStore.apiRoot}/api/v2_dexes/${id}/pairs`;
                return axios.get(resource, { params: options });
            },

            getV2DexQuote(from, to, amount, direction, slippageTolerance) {
                const id = explorerStore.v2Dex.id;
                const params = {
                    firebaseUserId: firebaseUserId.value, workspace: workspace.value,
                    from, to, amount, direction, slippageTolerance
                };

                const resource = `${envStore.apiRoot}/api/v2_dexes/${id}/quote`;
                return axios.get(resource, { params });
            },

            getV2DexTokens() {
                const id = explorerStore.v2Dex.id;
                const params = {
                    firebaseUserId: firebaseUserId.value, workspace: workspace.value,
                };

                const resource = `${envStore.apiRoot}/api/v2_dexes/${id}/tokens`;
                return axios.get(resource, { params });
            },

            createExplorerV2Dex(id, routerAddress, wrappedNativeTokenAddress) {
                const resource = `${envStore.apiRoot}/api/explorers/${id}/v2_dexes`;
                return axios.post(resource, { data: { routerAddress, wrappedNativeTokenAddress }});
            },

            getTxCount24h() {
                const params = { firebaseUserId: firebaseUserId.value, workspace: workspace.value, };

                const resource = `${envStore.apiRoot}/api/stats/txCount24h`;
                return axios.get(resource, { params });
            },

            getTxCountTotal() {
                const params = {
                    firebaseUserId: firebaseUserId.value, workspace: workspace.value,
                };
                const resource = `${envStore.apiRoot}/api/stats/txCountTotal`;
                return axios.get(resource, { params });
            },

            getActiveWalletCount() {
                const params = { firebaseUserId: firebaseUserId.value, workspace: workspace.value, };
                const resource = `${envStore.apiRoot}/api/stats/activeWalletCount`;
                return axios.get(resource, { params });
            },

            getFaucetTransactionHistory(id, options) {
                const params = {
                    firebaseUserId: firebaseUserId.value, workspace: workspace.value,
                    ...options
                };

                const resource = `${envStore.apiRoot}/api/faucets/${id}/transactionHistory`;
                return axios.get(resource, { params });
            },

            getFaucetTokenVolume(id, from, to) {
                const params = { firebaseUserId: firebaseUserId.value, workspace: workspace.value, from, to };

                const resource = `${envStore.apiRoot}/api/faucets/${id}/tokenVolume`;
                return axios.get(resource, { params });
            },

            getFaucetRequestVolume(id, from, to) {
                const params = { firebaseUserId: firebaseUserId.value, workspace: workspace.value, from, to };

                const resource = `${envStore.apiRoot}/api/faucets/${id}/requestVolume`;
                return axios.get(resource, { params });
            },

            deleteFaucet(id) {
                const resource = `${envStore.apiRoot}/api/faucets/${id}`;
                return axios.delete(resource);
            },

            getFaucetPrivateKey(id) {
                const resource = `${envStore.apiRoot}/api/faucets/${id}/privateKey`;
                return axios.get(resource);
            },

            requestFaucetToken(id, address) {
                const data = { firebaseUserId: firebaseUserId.value, workspace: workspace.value, address };

                const resource = `${envStore.apiRoot}/api/faucets/${id}/drip`;
                return axios.post(resource, { data });
            },

            deactivateFaucet(id) {
                const resource = `${envStore.apiRoot}/api/faucets/${id}/deactivate`;
                return axios.put(resource);
            },

            activateFaucet(id) {
                const resource = `${envStore.apiRoot}/api/faucets/${id}/activate`;
                return axios.put(resource);
            },

            getFaucetBalance(id) {
                const params = { firebaseUserId: firebaseUserId.value, workspace: workspace.value, };
                const resource = `${envStore.apiRoot}/api/faucets/${id}/balance`;
                return axios.get(resource, { params });
            },

            updateFaucet(id, amount, interval) {
                const resource = `${envStore.apiRoot}/api/faucets/${id}`;
                return axios.put(resource, { data: { amount, interval }});
            },

            createExplorerFaucet(explorerId, amount, interval) {
                const resource = `${envStore.apiRoot}/api/explorers/${explorerId}/faucets`;
                return axios.post(resource, { data: { amount, interval }});
            },

            getExplorerBilling() {
                const resource = `${envStore.apiRoot}/api/explorers/billing`;
                return axios.get(resource);
            },

            getQuotaExtensionPlan() {
                const resource = `${envStore.apiRoot}/api/explorers/quotaExtensionPlan`;
                return axios.get(resource);
            },

            cancelQuotaExtension(explorerId) {
                const resource = `${envStore.apiRoot}/api/explorers/${explorerId}/quotaExtension`;
                return axios.delete(resource);
            },

            updateQuotaExtension(explorerId, stripePlanSlug, quota) {
                const resource = `${envStore.apiRoot}/api/explorers/${explorerId}/quotaExtension`;
                return axios.put(resource, { data: { stripePlanSlug, quota }});
            },

            startTrial(explorerId, stripePlanSlug) {
                const resource = `${envStore.apiRoot}/api/explorers/${explorerId}/startTrial`;
                return axios.post(resource, { data: { stripePlanSlug }});
            },

            migrateDemoExplorer(token) {
                const resource = `${envStore.apiRoot}/api/demo/migrateExplorer`;
                return axios.post(resource, { data: { token }});
            },

            getExplorerFromToken(token) {
                const resource = `${envStore.apiRoot}/api/demo/explorers`;
                return axios.get(resource, { params: { token }});
            },

            createDemoExplorer(name, rpcServer, nativeToken) {
                const resource = `${envStore.apiRoot}/api/demo/explorers`;
                return axios.post(resource, { name, rpcServer, nativeToken });
            },

            startExplorerSync(id) {
                const resource = `${envStore.apiRoot}/api/explorers/${id}/startSync`;
                return axios.put(resource);
            },

            stopExplorerSync(id) {
                const resource = `${envStore.apiRoot}/api/explorers/${id}/stopSync`;
                return axios.put(resource);
            },

            getExplorerSyncStatus(id) {
                const resource = `${envStore.apiRoot}/api/explorers/${id}/syncStatus`;
                return axios.get(resource);
            },

            deleteWorkspace(id) {
                const resource = `${envStore.apiRoot}/api/workspaces/${id}`;
                return axios.delete(resource);
            },

            getExplorerDomainStatus(domainId) {
                const resource = `${envStore.apiRoot}/api/domains/${domainId}`;
                return axios.get(resource);
            },

            addExplorerDomain(explorerId, domain) {
                const data = { domain };
                const resource = `${envStore.apiRoot}/api/explorers/${explorerId}/domains`;
                return axios.post(resource, { data });
            },

            removeExplorerDomain(domainId) {
                const resource = `${envStore.apiRoot}/api/domains/${domainId}`;
                return axios.delete(resource);
            },

            deleteExplorer(explorerId) {
                const resource = `${envStore.apiRoot}/api/explorers/${explorerId}`;
                return axios.delete(resource);
            },

            startCryptoSubscription(stripePlanSlug, explorerId) {
                const data = { stripePlanSlug };
                const resource = `${envStore.apiRoot}/api/explorers/${explorerId}/cryptoSubscription`;
                return axios.post(resource, { data });
            },

            createExplorer(workspaceId) {
                const data = { workspaceId };
                const resource = `${envStore.apiRoot}/api/explorers`;
                return axios.post(resource, { data });
            },

            cancelExplorerSubscription(explorerId) {
                const resource = `${envStore.apiRoot}/api/explorers/${explorerId}/subscription`;
                return axios.delete(resource);
            },

            updateExplorerSubscription(explorerId, newStripePlanSlug) {
                const data = { newStripePlanSlug };
                const resource = `${envStore.apiRoot}/api/explorers/${explorerId}/subscription`;
                return axios.put(resource, { data });
            },

            getExplorerPlans() {
                const resource = `${envStore.apiRoot}/api/explorers/plans`;
                return axios.get(resource);
            },

            getCompilerVersions() {
                const resource = `${envStore.apiRoot}/api/external/compilers`;
                return axios.get(resource);
            },

            updateExplorerBranding(explorerId, data) {
                const resource = `${envStore.apiRoot}/api/explorers/${explorerId}/branding`;
                return axios.post(resource, { data }, { cache: { ttl: 0 }});
            },

            getExplorerMode(domain) {
                const resource = `${envStore.apiRoot}/api/explorers/search?domain=${domain}`;
                return axios.get(resource, { cache: { ttl: 100 }});
            },

            updateExplorerSettings(explorerId, data) {
                const resource = `${envStore.apiRoot}/api/explorers/${explorerId}/settings`;
                return axios.post(resource, { data }, { cache: { ttl: 0 }});
            },

            searchIcon(query) {
                const resource = `${envStore.apiRoot}/api/search/icons?icon=${query}`;
                return axios.get(resource, { cache: { ttl: 100 }});
            },

            searchFont(query) {
                const resource = `${envStore.apiRoot}/api/search/fonts?font=${query}`;
                return axios.get(resource, { cache: { ttl: 100 }});
            },

            getExplorers(params) {
                const resource = `${envStore.apiRoot}/api/explorers`;
                return axios.get(resource, { params });
            },

            getExplorer(slug) {
                const resource = `${envStore.apiRoot}/api/explorers/${slug}`;
                return axios.get(resource);
            },

            getExplorerStatus() {
                const params = { firebaseUserId: firebaseUserId.value, workspace: workspace.value, };

                const resource = `${envStore.apiRoot}/api/status`;
                return axios.get(resource, { params });
            },

            resetPassword(token, password) {
                const resource = `${envStore.apiRoot}/api/users/resetPassword`;
                return axios.post(resource, { token, password });
            },

            sendResetPasswordEmail(email) {
                const resource = `${envStore.apiRoot}/api/users/sendResetPasswordEmail`;
                return axios.post(resource, { email });
            },

            signUp(email, password, explorerToken) {
                const resource = `${envStore.apiRoot}/api/users/signup`;
                return axios.post(resource, { email, password, explorerToken });
            },

            signIn(email, password, explorerToken) {
                const resource = `${envStore.apiRoot}/api/users/signin`;
                return axios.post(resource, { email, password, explorerToken });
            },

            getAddressTokenTransfers(address, options) {
                const params = { firebaseUserId: firebaseUserId.value, workspace: workspace.value, ...options };

                const resource = `${envStore.apiRoot}/api/addresses/${address}/tokenTransfers`;
                return axios.get(resource, { params });
            },

            getAddressStats(address) {
                const params = { firebaseUserId: firebaseUserId.value, workspace: workspace.value, };

                const resource = `${envStore.apiRoot}/api/addresses/${address}/stats`;
                return axios.get(resource, { params });
            },

            getTransactionTokenBalanceChanges(transactionHash, options) {
                const params = { firebaseUserId: firebaseUserId.value, workspace: workspace.value, ...options };

                const resource = `${envStore.apiRoot}/api/transactions/${transactionHash}/tokenBalanceChanges`;
                return axios.get(resource, { params });
            },

            getTransactionTokenTransfers(transactionHash, options) {
                const params = { firebaseUserId: firebaseUserId.value, workspace: workspace.value, ...options };

                const resource = `${envStore.apiRoot}/api/transactions/${transactionHash}/tokenTransfers`;
                return axios.get(resource, { params });
            },

            getTransactionLogs(transactionHash, options) {
                const params = { firebaseUserId: firebaseUserId.value, workspace: workspace.value, ...options };

                const resource = `${envStore.apiRoot}/api/transactions/${transactionHash}/logs`;
                return axios.get(resource, { params });
            },

            getContractLogs(address, options) {
                const params = { firebaseUserId: firebaseUserId.value, workspace: workspace.value, ...options };

                const resource = `${envStore.apiRoot}/api/contracts/${address}/logs`;
                return axios.get(resource, { params });
            },

            updateContractWatchedPaths(address, paths) {
                const data = {
                    firebaseUserId: firebaseUserId.value,
                    workspace: workspace.value,
                    watchedPaths: paths
                };

                const resource = `${envStore.apiRoot}/api/contracts/${address}/watchedPaths`;
                return axios.post(resource, { data });
            },

            getProcessableContracts() {
                const params = {
                    firebaseUserId: firebaseUserId.value,
                    workspace: workspace.value,
                };

                const resource = `${envStore.apiRoot}/api/contracts/processable`;
                return axios.get(resource, { params });
            },

            getContractStats(address) {
                const params = { firebaseUserId: firebaseUserId.value, workspace: workspace.value, };

                const resource = `${envStore.apiRoot}/api/contracts/${address}/stats`;
                return axios.get(resource, { params });
            },

            getTokenTransfers(address, options) {
                const params = { firebaseUserId: firebaseUserId.value, workspace: workspace.value, ...options };

                const resource = `${envStore.apiRoot}/api/contracts/${address}/transfers`;
                return axios.get(resource, { params });
            },

            getTokenHolders(address, options) {
                const params = { firebaseUserId: firebaseUserId.value, workspace: workspace.value, ...options };

                const resource = `${envStore.apiRoot}/api/contracts/${address}/holders`;
                return axios.get(resource, { params });
            },

            getErc721TokensFrom(contractAddress, indexes) {
                const tokens = [];
                return new Promise((resolve, reject) => {
                    const data = { firebaseUserId: firebaseUserId.value, workspace: workspace.value, };

                    const resource = `${envStore.apiRoot}/api/erc721Tokens/${contractAddress}`;

                    const erc721Connector = new ERC721Connector(currentWorkspaceStore.rpcServer, contractAddress, { metadata: true, enumerable: true });
                    const promises = [];
                    for (let i = 0; i < indexes.length; i++) {
                        promises.push(erc721Connector.fetchTokenByIndex(indexes[i])
                            .then((token) => {
                                tokens.push(token)
                                axios.post(resource, { data: { ...data, token } });
                            }));
                    }
                    Promise.all(promises)
                        .then(() => resolve(tokens))
                        .catch(reject);
                })
            },

            setTokenProperties(contractAddress, properties) {
                const data = {
                    firebaseUserId: firebaseUserId.value,
                    workspace: workspace.value,
                    properties: properties
                };

                const resource = `${envStore.apiRoot}/api/contracts/${contractAddress}/tokenProperties`;
                return axios.post(resource, { data });
            },

            getErc721TokenTransfers(contractAddress, tokenId) {
                const params = { firebaseUserId: firebaseUserId.value, workspace: workspace.value, };

                const resource = `${envStore.apiRoot}/api/erc721Tokens/${contractAddress}/${tokenId}/transfers`;
                return axios.get(resource, { params });
            },

            reloadErc721Token(contractAddress, tokenId) {
                const data = { firebaseUserId: firebaseUserId.value, workspace: workspace.value, };

                const resource = `${envStore.apiRoot}/api/erc721Tokens/${contractAddress}/${tokenId}/reload`;
                return axios.post(resource, { data });
            },

            getErc721TotalSupply(contractAddress) {
                if (!explorerStore.id) {
                    const erc721Connector = new ERC721Connector(currentWorkspaceStore.rpcServer, contractAddress, { metadata: true, enumerable: true });
                    return new Promise((resolve, reject) => {
                        erc721Connector.totalSupply()
                            .then(res => resolve({ data: { totalSupply: res }}))
                            .catch(reject);
                    });
                }
                else {
                    const params = { firebaseUserId: firebaseUserId.value, workspace: workspace.value, };

                    const resource = `${envStore.apiRoot}/api/erc721Collections/${contractAddress}/totalSupply`;
                    return axios.get(resource, { params });
                }
            },

            getErc721TokenByIndex(contractAddress, tokenIndex) {
                if (!explorerStore.id) {
                    const erc721Connector = new ERC721Connector(currentWorkspaceStore.rpcServer, contractAddress, { metadata: true, enumerable: true });
                    return erc721Connector.tokenByIndex(tokenIndex)
                        .then(tokenId => {
                            if (!tokenId) return null;
                            return new Promise((resolve, reject) => {
                                erc721Connector.fetchTokenById(tokenId)
                                    .then(res => resolve({ data: formatErc721Metadata(res) }))
                                    .catch(reject);
                            });
                        });
                }
                else {
                    const params = { firebaseUserId: firebaseUserId.value, workspace: workspace.value, };
                    const resource = `${envStore.apiRoot}/api/erc721Tokens/${contractAddress}/tokenIndex/${tokenIndex}`;
                    return axios.get(resource, { params });
                }
            },

            getErc721TokenById(contractAddress, tokenId) {
                if (!explorerStore.id) {
                    const erc721Connector = new ERC721Connector(currentWorkspaceStore.rpcServer, contractAddress, { metadata: true, enumerable: true });
                    return new Promise((resolve, reject) => {
                        erc721Connector.fetchTokenById(tokenId)
                            .then(res => resolve({ data: formatErc721Metadata(res) }))
                            .catch(reject);
                    });
                }
                else {
                    const params = { firebaseUserId: firebaseUserId.value, workspace: workspace.value, };
                    const resource = `${envStore.apiRoot}/api/erc721Tokens/${contractAddress}/${tokenId}`;
                    return axios.get(resource, { params });
                }
            },

            getErc721Tokens(contractAddress, options, loadingEnabled) {
                const params = { firebaseUserId: firebaseUserId.value, workspace: workspace.value, ...options };

                if (!explorerStore.id || !loadingEnabled) {
                    return new Promise((resolve, reject) => {
                        const erc721Connector = new ERC721Connector(currentWorkspaceStore.rpcServer, contractAddress, { metadata: true, enumerable: true });
                        const promises = [];
                        const indexes = Array.from({ length: options.itemsPerPage }, (_, i) => options.itemsPerPage * (options.page - 1) + i);
                        for (let i = 0; i < indexes.length; i++)
                            promises.push(erc721Connector.fetchTokenByIndex(indexes[i]));

                        Promise.all(promises)
                            .then((res) => {
                                const tokens = sanitize(res.map(el => formatErc721Metadata(el)));
                                resolve({ data: { items: tokens }});
                            })
                            .catch(reject);
                    });
                }
                else {
                    const resource = `${envStore.apiRoot}/api/erc721Collections/${contractAddress}/tokens`;
                    return axios.get(resource, { params });
                }
            },

            submitExplorerLead(email) {
                const data = { firebaseUserId: firebaseUserId.value, workspace: workspace.value, email };

                const resource = `${envStore.apiRoot}/api/marketing/submitExplorerLead`;
                return axios.post(resource, { data });
            },

            verifyContract(address, data) {
                const resource = `${envStore.apiRoot}/api/contracts/${address}/verify`;
                return axios.post(resource, data);
            },

            getTokenTransferVolume(from, to, address, type) {
                const params = { firebaseUserId: firebaseUserId.value, workspace: workspace.value, from, to, address, type };
                const resource = `${envStore.apiRoot}/api/stats/tokenTransferVolume`;
                return axios.get(resource, { params });
            },

            getTokenHolderHistory(from, to, address) {
                const params = { firebaseUserId: firebaseUserId.value, workspace: workspace.value, from, to, address };
                const resource = `${envStore.apiRoot}/api/contracts/${address}/holderHistory`;
                return axios.get(resource, { params });
            },

            getTokenCirculatingSupply(from, to, address) {
                const params = { firebaseUserId: firebaseUserId.value, workspace: workspace.value, from, to, address };
                const resource = `${envStore.apiRoot}/api/contracts/${address}/circulatingSupply`;
                return axios.get(resource, { params });
            },

            getTransactionVolume(from, to) {
                const params = { firebaseUserId: firebaseUserId.value, workspace: workspace.value, from, to };
                const resource = `${envStore.apiRoot}/api/stats/transactions`;
                return axios.get(resource, { params });
            },

            getUniqueWalletCount(from, to) {
                const params = { firebaseUserId: firebaseUserId.value, workspace: workspace.value, from, to };
                const resource = `${envStore.apiRoot}/api/stats/uniqueWalletCount`;
                return axios.get(resource, { params });
            },

            getCumulativeWalletCount(from, to) {
                const params = { firebaseUserId: firebaseUserId.value, workspace: workspace.value, from, to };
                const resource = `${envStore.apiRoot}/api/stats/cumulativeWalletCount`;
                return axios.get(resource, { params });
            },

            getCumulativeDeployedContractCount(from, to) {
                const params = {
                    firebaseUserId: firebaseUserId.value,
                    workspace: workspace.value,
                    from, to
                };
                const resource = `${envStore.apiRoot}/api/stats/cumulativeDeployedContractCount`;
                return axios.get(resource, { params });
            },

            getDeployedContractCount(from, to) {
                const params = {
                    firebaseUserId: firebaseUserId.value,
                    workspace: workspace.value,
                    from, to
                };
                const resource = `${envStore.apiRoot}/api/stats/deployedContractCount`;
                return axios.get(resource, { params });
            },

            getAverageGasPrice(from, to) {
                const params = {
                    firebaseUserId: firebaseUserId.value,
                    workspace: workspace.value,
                    from, to
                };
                const resource = `${envStore.apiRoot}/api/stats/averageGasPrice`;
                return axios.get(resource, { params });
            },

            getAverageTransactionFee(from, to) {
                const params = {
                    firebaseUserId: firebaseUserId.value,
                    workspace: workspace.value,
                    from, to
                };
                const resource = `${envStore.apiRoot}/api/stats/averageTransactionFee`;
                return axios.get(resource, { params });
            },

            getTokenBalances(address, patterns) {
                const params = {
                    firebaseUserId: firebaseUserId.value,
                    workspace: workspace.value,
                    patterns: patterns
                };
                const resource = `${envStore.apiRoot}/api/addresses/${address}/balances`;
                return axios.get(resource, { params });
            },

            search(type, query) {
                const params = {
                    firebaseUserId: firebaseUserId.value,
                    workspace: workspace.value,
                    type: type,
                    query: query
                };
                const resource = `${envStore.apiRoot}/api/search`;
                return axios.get(resource, { params });
            },

            getBlocks(options, withCount) {
                const params = {
                    firebaseUserId: firebaseUserId.value,
                    workspace: workspace.value,
                    ...options, withCount
                };
                const resource = `${envStore.apiRoot}/api/blocks`;
                return axios.get(resource, { params, cache: { ttl: CACHE_TTL }});
            },

            getBlock(number, withTransactions = true) {
                const params = {
                    firebaseUserId: firebaseUserId.value,
                    workspace: workspace.value,
                    withTransactions: withTransactions
                };
                const resource = `${envStore.apiRoot}/api/blocks/${number}`;
                return axios.get(resource, { params });
            },

            getBlockTransactions(blockNumber, options, withCount) {
                const params = {
                    firebaseUserId: firebaseUserId.value,
                    workspace: workspace.value,
                    ...options, withCount
                };
                const resource = `${envStore.apiRoot}/api/blocks/${blockNumber}/transactions`;
                return axios.get(resource, { params, cache: { ttl: currentWorkspaceStore.public ? CACHE_TTL : 0 }});
            },

            getTransactions(options, withCount) {
                const params = {
                    firebaseUserId: firebaseUserId.value,
                    workspace: workspace.value,
                    ...options, withCount
                };
                const resource = `${envStore.apiRoot}/api/transactions`;
                return axios.get(resource, { params, cache: { ttl: currentWorkspaceStore.public ? CACHE_TTL : 0 }});
            },

            getTransaction(hash) {
                const params = {
                    firebaseUserId: firebaseUserId.value,
                    workspace: workspace.value,
                };
                const resource = `${envStore.apiRoot}/api/transactions/${hash}`;
                return axios.get(resource, { params });
            },

            getContracts(options) {
                const params = {
                    firebaseUserId: firebaseUserId.value,
                    workspace: workspace.value,
                    ...options
                };
                const resource = `${envStore.apiRoot}/api/contracts`;
                return axios.get(resource, { params });
            },

            getContract(address) {
                const params = {
                    firebaseUserId: firebaseUserId.value,
                    workspace: workspace.value,
                };
                const resource = `${envStore.apiRoot}/api/contracts/${address.toLowerCase()}`;
                return axios.get(resource, { params, cache: { ttl: 5000 } });
            },

            getAddressTransactions(address, options) {
                const params = {
                    firebaseUserId: firebaseUserId.value,
                    workspace: workspace.value,
                    ...options
                };
                const resource = `${envStore.apiRoot}/api/addresses/${address}/transactions`;
                return axios.get(resource, { params });
            },

            getAccounts(options) {
                const params = {
                    firebaseUserId: firebaseUserId.value,
                    workspace: workspace.value,
                    ...options
                };
                const resource = `${envStore.apiRoot}/api/accounts`;
                return axios.get(resource, { params });
            },

            async getCurrentUser() {
                const params = {
                    firebaseUserId: firebaseUserId.value
                };
                const resource = `${envStore.apiRoot}/api/users/me`;
                return axios.get(resource, { params });
            },

            setCurrentWorkspace(workspace) {
                const data = {
                    workspace: workspace,
                    firebaseUserId: firebaseUserId.value
                };
                const resource = `${envStore.apiRoot}/api/users/me/setCurrentWorkspace`;
                return axios.post(resource, { data });
            },

            getPublicExplorerByDomain(domain) {
                const params = {
                    domain: domain
                };
                const resource = `${envStore.apiRoot}/api/explorers/search`;
                return axios.get(resource, { params });
            },

            getPublicExplorerBySlug(slug) {
                const params = {
                    slug: slug
                };
                const resource = `${envStore.apiRoot}/api/explorers/search`;
                return axios.get(resource, { params });
            },

            getProcessableTransactions() {
                const params = {
                    firebaseUserId: firebaseUserId.value,
                    workspace: workspace.value,
                };
                const resource = `${envStore.apiRoot}/api/transactions/processable`;
                return axios.get(resource, { params });
            },

            getFailedProcessableTransactions() {
                const params = {
                    firebaseUserId: firebaseUserId.value,
                    workspace: workspace.value,
                };
                const resource = `${envStore.apiRoot}/api/transactions/failedProcessable`;
                return axios.get(resource, { params });
            },

            createWorkspace(name, workspaceData) {
                const data = {
                    name: name,
                    workspaceData: workspaceData,
                    firebaseUserId: firebaseUserId.value
                };
                const resource = `${envStore.apiRoot}/api/workspaces`;
                // return new Promise((r) => r({ a: 1 }));
                return axios.post(resource, { data });
            },

            getWorkspaces() {
                const params = {
                    firebaseUserId: firebaseUserId.value
                };

                const resource = `${envStore.apiRoot}/api/workspaces`;
                return axios.get(resource, { params });
            },

            syncBalance(address, balance, _workspace) {
                const data = {
                    firebaseUserId: firebaseUserId.value,
                    workspace: _workspace || workspace.value,
                    balance: balance
                };

                const resource = `${envStore.apiRoot}/api/accounts/${address}/syncBalance`;
                return axios.post(resource, { data });
            },

            createStripeExplorerCheckoutSession(explorerId, stripePlanSlug, successUrl, cancelUrl) {
                const data = {
                    explorerId, stripePlanSlug, successUrl, cancelUrl
                };

                const resource = `${envStore.apiRoot}/api/stripe/createExplorerCheckoutSession`;
                return axios.post(resource, { data });
            },

            createStripeUserCheckoutSession() {
                const resource = `${envStore.apiRoot}/api/stripe/createUserCheckoutSession`;
                return axios.post(resource);
            },

            createStripePortalSession(returnUrl) {
                const data = { returnUrl };
                const resource = `${envStore.apiRoot}/api/stripe/createPortalSession`;
                return axios.post(resource, { data });
            },

            updateWorkspaceSettings(settings) {
                const data = {
                    firebaseUserId: firebaseUserId.value,
                    workspace: workspace.value,
                    settings: settings
                };

                const resource = `${envStore.apiRoot}/api/workspaces/settings`;
                return axios.post(resource, { data });
            },

            importContract(contractAddress) {
                const data = {
                    firebaseUserId: firebaseUserId.value,
                    workspace: workspace.value,
                };

                const resource = `${envStore.apiRoot}/api/contracts/${contractAddress}`;
                return axios.post(resource, { data });
            },

            syncTransactionData(hash, transactionData) {
                const data = {
                    firebaseUserId: firebaseUserId.value,
                    workspace: workspace.value,
                    data: transactionData
                };

                const resource = `${envStore.apiRoot}/api/transactions/${hash}/storage`;
                return axios.post(resource, { data });
            },

            reprocessTransaction(transactionHash) {
                const data = {
                    firebaseUserId: firebaseUserId.value,
                    workspace: workspace.value,
                    transaction: transactionHash
                };

                const resource = `${envStore.apiRoot}/api/transactions/${transactionHash}/process`;
                return axios.post(resource, { data });
            },

            removeContract(address) {
                const data = {
                    firebaseUserId: firebaseUserId.value,
                    workspace: workspace.value,
                };

                const resource = `${envStore.apiRoot}/api/contracts/${address}/remove`;
                return axios.post(resource, { data });
            },

            resetWorkspace() {
                const data = {
                    firebaseUserId: firebaseUserId.value,
                    workspace: workspace.value,
                };

                const resource = `${envStore.apiRoot}/api/workspaces/reset`;
                return axios.post(resource, { data });
            },

            syncContractData(address, name, abi, watchedPaths) {
                const data = {
                    firebaseUserId: firebaseUserId.value,
                    workspace: workspace.value,
                    address: address,
                    name: name,
                    abi: abi,
                    watchedPaths: watchedPaths
                };

                const resource = `${envStore.apiRoot}/api/contracts/${address}`;
                return axios.post(resource, { data });
            },

            storeAccountPrivateKey(account, privateKey) {
                const data = {
                    firebaseUserId: firebaseUserId.value,
                    workspace: workspace.value,
                    privateKey: privateKey
                };

                const resource = `${envStore.apiRoot}/api/accounts/${account}/privateKey`;
                return axios.post(resource, { data });
            },

            syncFailedTransactionError(transactionHash, error) {
                const data = {
                    firebaseUserId: firebaseUserId.value,
                    workspace: workspace.value,
                    error: error
                };

                const resource = `${envStore.apiRoot}/api/transactions/${transactionHash}/error`;
                return axios.post(resource, { data });
            },

            syncTokenBalanceChanges(transactionHash, tokenTransferId, changes) {
                const data = {
                    firebaseUserId: firebaseUserId.value,
                    workspace: workspace.value,
                    tokenTransferId: tokenTransferId,
                    changes: changes
                };

                const resource = `${envStore.apiRoot}/api/transactions/${transactionHash}/tokenBalanceChanges`;
                return axios.post(resource, { data });
            },

            getProvider: serverFunctions._getProvider,

            async processContracts(rpcServer) {
                try {
                    const contracts = (await this.getProcessableContracts()).data;
                    const provider = serverFunctions._getProvider(rpcServer);
                    for (let i = 0; i < contracts.length; i++) {
                        const contract = contracts[i];
                        try {
                            let properties = await findPatterns(rpcServer, contract.address, contract.abi);
                            const bytecode = await provider.getCode(contract.address);
                            if (bytecode.length > 0)
                                properties = { ...properties, bytecode: bytecode };
                            await this.setTokenProperties(contract.address, properties);
                        } catch(error) {
                            console.log(`Error processing contract ${contract.address}`);
                            console.log(error);
                        }
                    }
                } catch(error) {
                    console.log(error);
                    var reason = error.reason || error.message || "Can't connect to the server";
                    throw { reason: reason };
                }
            },

            async processFailedTransactions(transactions, rpcServer) {
                 try {
                    for (let i = 0; i < transactions.length; i++) {
                        const transaction = transactions[i];
                        if (transaction.receipt.status === 0 || transaction.receipt.status === false) {
                            serverFunctions.fetchErrorData(transaction, rpcServer)
                                .then(result => this.syncFailedTransactionError(transaction.hash, result))
                                .catch(console.log);
                        }
                    }
                } catch(error) {
                    console.log(error);
                    var reason = error.reason || error.message || "Can't connect to the server";
                    throw { reason: reason };
                }
            },

            async processTransaction(workspace, transaction) {
                for (let j = 0; j < transaction.tokenTransfers.length; j++) {
                    try {
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
                            this.syncTokenBalanceChanges(transaction.hash, transfer.id, changes);
                    } catch(error) {
                        console.log(error);
                        continue;
                    }
                }
            },

            async searchForLocalChains() {
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
            impersonateAccount(rpcServer, accountAddress) {
                return new Promise((resolve, reject) => {
                    serverFunctions
                        .impersonateAccount({ rpcServer: rpcServer, accountAddress: accountAddress })
                        .then(resolve)
                        .catch(reject)
                });
            },
            getAccountBalance(account) {
                return new Promise((resolve, reject) => {
                    serverFunctions
                        .getAccountBalance({ rpcServer: _rpcServer(), account: account })
                        .then(resolve)
                        .catch(reject)
                });
            },
            initRpcServer(rpcServer) {
                return new Promise((resolve, reject) => {
                    serverFunctions
                        .initRpcServer({ rpcServer: rpcServer })
                        .then(resolve)
                        .catch(reject)
                });
            },
            getRpcAccounts(rpcServer) {
                return new Promise((resolve, reject) => {
                    serverFunctions
                        .getRpcAccounts({ rpcServer: rpcServer })
                        .then(resolve)
                        .catch(reject)
                });
            },
            callContractReadMethod(contract, method, options, params, rpcServer, provider) {
                return new Promise((resolve, reject) => {
                    serverFunctions
                        .callContractReadMethod({ contract: contract, method: method, options: options, params: params, rpcServer: rpcServer, provider: provider })
                        .then(resolve)
                        .catch(reject)
                });
            },
            callContractWriteMethod(contract, method, options, params, rpcServer) {
                return new Promise((resolve, reject) => {
                    serverFunctions
                        .callContractWriteMethod({ contract: contract, method: method, options: options, params: params, rpcServer: rpcServer })
                        .then(resolve)
                        .catch(reject)
                });
            },
            getStructure(contract, rpcServer) {
                return new Promise((resolve, reject) => {
                    serverFunctions
                        .getStructure({ contract: contract, rpcServer: rpcServer })
                        .then(resolve)
                        .catch(reject)
                });
            },
            decodeData(contract, rpcServer, blockNumber) {
                return new Promise((resolve, reject) => {
                    serverFunctions
                        .decodeData({ contract: contract, rpcServer: rpcServer, blockNumber: blockNumber })
                        .then(resolve)
                        .catch(reject)
                });
            },
            transferErc721Token: serverFunctions.transferErc721Token
        };

        app.config.globalProperties.$server = $server;
        app.provide('$server', $server);
    }
};
