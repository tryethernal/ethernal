import LogRocket from 'logrocket';
import Vue from 'vue';
import Vuex from 'vuex';
const { sanitize } = require('../lib/utils');

Vue.use(Vuex);

export default new Vuex.Store({
    state: {
        user: {},
        currentBlock: {},
        publicExplorer: {
            name: null,
            slug: null,
            token: null,
            chainId: null,
            domain: null,
            theme: 'light',
            totalSupply: null
        },
        currentWorkspace: {
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
        }
    },
    actions: {
        updateAccounts({ commit }, accounts) {
            commit('SET_ACCOUNTS', accounts);
        },
        updateUser({ commit }, user) {
            if (user) {
                commit('SET_USER', sanitize({
                    uid: user.uid,
                    email: user.email,
                    loggedIn: true,
                    id: user.id,
                    plan: user.plan
                }));
                if (process.env.VUE_APP_ENABLE_ANALYTICS)
                    LogRocket.identify(user.uid, { email: user.email });
                if (process.env.VUE_APP_ENABLE_FEEDBACK && window.feedbackfin && user.email)
                    window.feedbackfin.config.user = { email: user.email, ...window.feedbackfin.config.user };
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
        },
        updateConnected({ commit }, connected) {
            commit('SET_CONNECTED', connected);
        },
        updateUserPlan({ commit }, data) {
            commit('SET_USER_PLAN', data.plan);
            if (process.env.VUE_APP_ENABLE_ANALYTICS && data.uid && data.plan && data.plan != 'free') {
                LogRocket.identify(data.uid, { email: data.email, plan: data.plan });
            }
        },
        updateOnboardedStatus({ commit }, status) {
            commit('SET_ONBOARDED_STATUS', status);
        },
        updatePublicExplorerSlug({ commit }, slug) {
            commit('SET_PUBLIC_EXPLORER_SLUG', slug);
        },
        setPublicExplorerData({ commit }, data) {
            commit('SET_PUBLIC_EXPLORER_DATA', data);
        },
        updatePublicExplorerDomain({ commit }, domain) {
            commit('SET_PUBLIC_EXPLORER_DOMAIN', domain);
        },
        updateFirebaseIdToken({ commit }, token) {
            commit('SET_FIREBASE_ID_TOKEN', token);
        }
    },
    getters: {
        accounts: state => state.accounts,
        firebaseIdToken: state => state.user.firebaseIdToken || '',
        theme: state => state.publicExplorer.theme,
        isUserLoggedIn: state => !!state.user.uid,
        isUserAdmin: state => state.currentWorkspace && state.user.uid == state.currentWorkspace.firebaseUserId,
        isPublicExplorer: state => !!state.publicExplorer.slug || !!state.publicExplorer.domain || (state.currentWorkspace.public && state.user.uid == state.currentWorkspace.firebaseUserId),
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
