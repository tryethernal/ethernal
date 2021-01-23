import Vue from 'vue';
import VueRouter from 'vue-router';
import Vuex from 'vuex';

import vuetify from './plugins/vuetify';
import { dbPlugin, auth } from './plugins/firebase';
import { firestorePlugin } from 'vuefire';

import App from './App.vue';
import Blocks from './components/Blocks.vue';
import Block from './components/Block.vue';
import Transactions from './components/Transactions.vue';
import Accounts from './components/Accounts.vue';
import Transaction from './components/Transaction.vue';
import Address from './components/Address.vue';
import Auth from './components/Auth.vue';
import Contracts from './components/Contracts.vue';
import Settings from './components/Settings.vue';

Vue.config.productionTip = false;
Vue.use(VueRouter);
Vue.use(Vuex);
Vue.use(firestorePlugin);
Vue.use(require('vue-moment'));

var redirectIfLoggedIn = function (to, from, next) {
    if (auth().currentUser) {
        next({ path: '/transactions' });
    }
    else next();
}

var redirectIfLoggedOut = function (to, from, next) {
    if (!auth().currentUser) {
        next({ path: `/auth?next=${document.location.pathname}` });
    }
    else next();
}

const routes = [
    { path: '/auth', component: Auth, beforeEnter: redirectIfLoggedIn },
    { path: '/blocks', component: Blocks, beforeEnter: redirectIfLoggedOut },
    { path: '/block/:number', component: Block, props: true, beforeEnter: redirectIfLoggedOut },
    { path: '/transactions', component: Transactions, beforeEnter: redirectIfLoggedOut },
    { path: '/accounts', component: Accounts, beforeEnter: redirectIfLoggedOut },
    { path: '/transaction/:hash', component: Transaction, props: true, beforeEnter: redirectIfLoggedOut },
    { path: '/address/:hash', component: Address, props: true, beforeEnter: redirectIfLoggedOut },
    { path: '/contracts', component: Contracts, props: true, beforeEnter: redirectIfLoggedOut },
    { path: '/settings', component: Settings, props: true, beforeEnter: redirectIfLoggedOut },
    { path: '*', redirect: '/transactions' }
];

const router = new VueRouter({
    mode: 'history',
    routes: routes
});

const store = new Vuex.Store({
    state: {
        user: null,
        networkId: null,
        currentBlock: null,
        settings: {
            rpcServer: null,
            defaultAccount: null,
            gasPrice: null,
            gas: null
        },
        currentWorkspace: null
    },
    mutations: {
        SET_USER(state, data) {
            state.user = data;
        },
        SET_NETWORK_ID(state, networkId) {
            state.networkId = networkId;
        },
        SET_CURRENT_BLOCK(state, newBlockNumber) {
            state.currentBlock = newBlockNumber;
        },
        SET_SETTINGS(state, settings) {
            state.settings = settings;
        },
        SET_CURRENT_WORKSPACE(state, currentWorkspace) {
            state.currentWorkspace = currentWorkspace;
        }
    },
    actions: {
        updateUser({ commit }, user) {
            if (user) {
                commit('SET_USER', { uid: user.uid, email: user.email, loggedIn: true });
            }
            else  {
                commit('SET_USER', null);
            }
        },
        updateNetworkId({ commit }, networkId) {
            commit('SET_NETWORK_ID', networkId);
        },
        updateCurrentBlock({ commit }, newBlockNumber) {
            commit('SET_CURRENT_BLOCK', newBlockNumber);
        },
        updateSettings({ commit }, settings) {
            commit('SET_SETTINGS', settings);
        },
        updateCurrentWorkspace({ commit }, currentWorkspace) {
            commit('SET_CURRENT_WORKSPACE', currentWorkspace);
        }
    },
    getters: {
        user: state => state.user,
        networkId: state => state.networkId,
        settings: state => state.settings,
        currentBlock: state => state.currentBlock,
        currentWorkspace: state => state.currentWorkspace
    }
});

Vue.use(dbPlugin, { store: store });

new Vue({
    vuetify,
    router,
    store: store,
    mounted: function() {
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
                return this.$router.push(this.$route.query.next || '/transactions');
            }
        }
    },
    render: h => h(App),
}).$mount('#app')
