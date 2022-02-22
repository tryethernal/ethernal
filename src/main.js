import LogRocket from 'logrocket';

import Vue from 'vue';
import VueRouter from 'vue-router';
import Vuex from 'vuex';

import vuetify from './plugins/vuetify';
import router from './plugins/router';
import { dbPlugin, auth } from './plugins/firebase';
import { serverPlugin } from './plugins/server';
import { firestorePlugin } from 'vuefire';

import App from './App.vue';

Vue.config.productionTip = false;
Vue.use(VueRouter);
Vue.use(Vuex);
Vue.use(firestorePlugin);
Vue.use(require('vue-moment'));

const store = new Vuex.Store({
    state: {
        user: null,
        currentBlock: null,
        currentWorkspace: {
            networkId: null,
            rpcServer: null,
            name: null,
            settings: {
                defaultAccount: null,
                gasPrice: null,
                gas: null
            },
        },
        connected: false,
        stats: {
            transactionCount: 0,
            blockCount: 0
        }
    },
    mutations: {
        SET_USER(state, data) {
            state.user = data;
        },
        SET_CURRENT_BLOCK(state, newBlockNumber) {
            state.currentBlock = newBlockNumber;
        },
        SET_CURRENT_WORKSPACE(state, currentWorkspace) {
            state.currentWorkspace = currentWorkspace;
        },
        SET_CONNECTED(state, connected) {
            state.connected = connected;
        },
        SET_USER_PLAN(state, plan) {
            state.user = { ...state.user, plan: plan };
        },
        SET_ONBOARDED_STATUS(state, status) {
            state.user.onboarded = status;
        },
        SET_TRANSACTION_COUNT(state, count) {
            state.stats.transactionCount = count;
        },
        SET_BLOCK_COUNT(state, count) {
            state.stats.blockCount = count
        }
    },
    actions: {
        updateTransactionCount({ commit }, count) {
            commit('SET_TRANSACTION_COUNT', count);
        },
        updateBlockCount({ commit }, count) {
            commit('SET_BLOCK_COUNT', count);
        },
        updateUser({ commit }, user) {
            if (user) {
                commit('SET_USER', { uid: user.uid, email: user.email, loggedIn: true });
                if (process.env.VUE_APP_ENABLE_ANALYTICS)
                    LogRocket.identify(user.uid, { email: user.email });
            }
            else {
                commit('SET_USER', null);
            }
        },
        updateCurrentBlock({ commit }, newBlockNumber) {
            commit('SET_CURRENT_BLOCK', newBlockNumber);
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
        }
    },
    getters: {
        transactionCount: state => state.stats.transactionCount,
        blockCount: state => state.stats.blockCount,
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
            }
        }),
        chain: (state, getters) => {
            return getters.chains[state.currentWorkspace.chain || 'ethereum'];
        }
    }
});

Vue.use(dbPlugin, { store: store });
Vue.use(serverPlugin, { store: store });

new Vue({
    vuetify,
    router,
    store: store,
    mounted: function() {
        if (process.env.VUE_APP_ENABLE_ANALYTICS)
            LogRocket.init(process.env.VUE_APP_LOGROCKET_ID);

        auth().onAuthStateChanged(this.authStateChanged);
    },
    methods: {
        authStateChanged: function(user) {
            var currentPath = this.$router.currentRoute.path;
            store.dispatch('updateUser', user);
            if (currentPath != '/auth' && !user) {
                return this.$router.push('/auth');
            }
            if (currentPath == '/auth' && user) {
                var queryParams = { ...this.$route.query };
                delete queryParams.next;
                return this.$router.push({ path: this.$route.query.next || '/transactions', query: queryParams});
            }
        }
    },
    render: h => h(App),
}).$mount('#app')
