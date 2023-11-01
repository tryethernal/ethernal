import LogRocket from 'logrocket';
import Vue from 'vue';
import Vuex from 'vuex';
const { sanitize } = require('../lib/utils');

Vue.use(Vuex);

export default new Vuex.Store({
    state: {
        user: {},
        currentBlock: {},
        publicExplorer: null,
        currentWorkspace: {
            storageEnabled: true,
            userId: '',
            networkId: null,
            rpcServer: null,
            name: '',
            isAdmin: null,
            settings: {
                defaultAccount: null,
                gasPrice: null,
                gas: null
            },
        },
        accounts: [],
        connected: false
    },
    mutations: {
        SET_ACCOUNTS(state, accounts) {
            if (accounts.length)
                state.accounts = accounts;
        },
        SET_USER(state, data) {
            state.user = data ? { ...state.user, ...data } : {};
        },
        SET_CURRENT_BLOCK(state, newBlock) {
            state.currentBlock = newBlock;
        },
        SET_CURRENT_WORKSPACE(state, currentWorkspace) {
            state.currentWorkspace = {
                ...state.currentWorkspace,
                ...currentWorkspace
            };
        },
        SET_CONNECTED(state, connected) {
            state.connected = connected;
        },
        SET_USER_PLAN(state, plan) {
            state.user = { ...state.user, plan: plan };
        },
        SET_ONBOARDED_STATUS(state, status) {
            state.user = { ...state.user, onboarded: status };
        },
        SET_PUBLIC_EXPLORER_SLUG(state, slug) {
            state.publicExplorer.slug = slug;
        },
        SET_PUBLIC_EXPLORER_DATA(state, data) {
            state.publicExplorer = {
                ...state.publicExplorer,
                ...data
            };
        },
        SET_PUBLIC_EXPLORER_DOMAIN(state, domain) {
            state.publicExplorer = {
                ...state.publicExplorer,
                domain: domain
            }
        },
        SET_FIREBASE_ID_TOKEN(state, token) {
            state.user = {
                ...state.user,
                firebaseIdToken: token
            }
        },
        UPDATE_BROWSER_SYNC_STATUS(state, status) {
            state.currentWorkspace = {
                ...state.currentWorkspace,
                browserSyncEnabled: status
            }
        }
    },
    actions: {
        startBrowserSync({ commit, getters }) {
            const rpcListenerWorker = new Worker('../workers/blockSyncer.worker.js', { type: 'module' });
            rpcListenerWorker.onmessage = () => commit('UPDATE_BROWSER_SYNC_STATUS', false);
            rpcListenerWorker.postMessage({
                apiRoot: getters.apiRoot,
                rpcServer: getters.currentWorkspace.rpcServer,
                apiToken: getters.user.apiToken,
                workspace: getters.currentWorkspace.name
            });
        },
        updateBrowserSyncStatus({ commit }, status) {
            commit('UPDATE_BROWSER_SYNC_STATUS', status);
        },
        updateAccounts({ commit }, accounts) {
            commit('SET_ACCOUNTS', accounts);
        },
        updateUser({ commit }, user) {
            if (user) {
                if (user.apiToken)
                    localStorage.setItem('apiToken', user.apiToken);

                commit('SET_USER', sanitize({
                    uid: user.firebaseUserId,
                    email: user.email,
                    loggedIn: true,
                    id: user.id,
                    plan: user.plan,
                    apiToken: user.apiToken,
                    canTrial: user.canTrial,
                    cryptoPaymentEnabled: user.cryptoPaymentEnabled,
                    canUseDemoPlan: user.canUseDemoPlan
                }));

                if (process.env.VUE_APP_ENABLE_ANALYTICS)
                    LogRocket.identify(user.firebaseUserId, { email: user.email });
            }
            else {
                commit('SET_USER', null);
            }
        },
        updateCurrentBlock({ commit }, newBlock) {
            commit('SET_CURRENT_BLOCK', newBlock);
        },
        updateCurrentWorkspace({ commit }, currentWorkspace) {
            commit('SET_CURRENT_WORKSPACE', currentWorkspace);
            if (currentWorkspace.explorer)
            commit('SET_PUBLIC_EXPLORER_DATA', currentWorkspace.explorer);
        },
        updateConnected({ commit }, connected) {
            commit('SET_CONNECTED', connected);
        },
        updateUserPlan({ commit }, data) {
            commit('SET_USER_PLAN', data.plan);
            if (process.env.VUE_APP_ENABLE_ANALYTICS && data.uid && data.plan && data.plan != 'free')
                LogRocket.identify(data.uid, { email: data.email, plan: data.plan });
        },
        updateOnboardedStatus({ commit }, status) {
            commit('SET_ONBOARDED_STATUS', status);
        },
        setPublicExplorerData({ commit }, data) {
            commit('SET_PUBLIC_EXPLORER_DATA', data);
        },
        updateFirebaseIdToken({ commit }, token) {
            commit('SET_FIREBASE_ID_TOKEN', token);
        }
    },
    getters: {
        hasDemoEnabled: () => !!process.env.VUE_APP_ENABLE_DEMO,
        mainDomain: () => process.env.VUE_APP_MAIN_DOMAIN,
        isBillingEnabled: () => !!process.env.VUE_APP_ENABLE_BILLING,
        apiRoot: () => process.env.VUE_APP_API_ROOT,
        publicExplorerMode: state => !!state.publicExplorer,
        rpcServer: state => state.publicExplorer ? state.publicExplorer.rpcServer : state.currentWorkspace.rpcServer,
        accounts: state => state.accounts,
        firebaseIdToken: state => state.user.firebaseIdToken || '',
        theme: state => state.publicExplorer && state.publicExplorer.theme,
        isUserLoggedIn: state => !!state.user.apiToken,
        isUserAdmin: state => state.currentWorkspace && state.user.id == state.currentWorkspace.userId,
        isPublicExplorer: state => state.publicExplorer && (!!state.publicExplorer.slug || !!state.publicExplorer.domain || (state.currentWorkspace.public && state.user.uid == state.currentWorkspace.firebaseUserId)),
        publicExplorer: state => state.publicExplorer,
        user: state => {
            return { ...state.user, plan: state.user.plan || 'free' };
        },
        currentBlock: state => state.currentBlock,
        currentWorkspace: state => state.currentWorkspace,
        connected: state => state.connected,
        chains: () => ({
            ethereum: {
                slug: 'ethereum',
                name: 'Ethereum',
                token: 'Ether',
                scanner: 'Etherscan'
            },
            bsc: {
                slug: 'bsc',
                name: 'BSC',
                token: 'BNB',
                scanner: 'BSCscan'
            },
            matic: {
                slug: 'matic',
                name: 'Matic',
                token: 'Matic',
                scanner: 'Polygonscan'
            },
            avax: {
                slug: 'avax',
                name: 'Avalanche',
                token: 'Avax',
                scanner: 'Snowtrace'
            },
            arbitrum: {
                slug: 'arbitrum',
                name: 'Arbitrum',
                token: 'Ether',
                scanner: 'Arbiscan'
            }
        }),
        chain: (state, getters) => {
            return getters.isPublicExplorer ?
                state.publicExplorer :
                getters.chains[state.currentWorkspace.chain || 'ethereum'];
        }
    }
});
