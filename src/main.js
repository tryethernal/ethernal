import LogRocket from 'logrocket';

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
        connected: false
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
        updateCurrentBlock({ commit }, newBlockNumber) {
            commit('SET_CURRENT_BLOCK', newBlockNumber);
        },
        updateCurrentWorkspace({ commit }, currentWorkspace) {
            commit('SET_CURRENT_WORKSPACE', currentWorkspace);
        },
        updateConnected({ commit }, connected) {
            commit('SET_CONNECTED', connected);
        },

    },
    getters: {
        user: state => state.user,
        currentBlock: state => state.currentBlock,
        currentWorkspace: state => state.currentWorkspace,
        connected: state => state.connected
    }
});

Vue.use(dbPlugin, { store: store });

new Vue({
    vuetify,
    router,
    store: store,
    mounted: function() {
        if (process.env.NODE_ENV == 'production')
            LogRocket.init('lqunne/ethernal');

        auth().onAuthStateChanged(this.authStateChanged);
    },
    methods: {
        authStateChanged: function(user) {
            if (process.env.NODE_ENV == 'production' && user)
                LogRocket.identify(user.uid, { email: user.email });

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
