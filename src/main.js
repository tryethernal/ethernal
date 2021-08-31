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
            localNetwork: true,
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

    },
    getters: {
        user: state => state.user,
        currentBlock: state => state.currentBlock,
        currentWorkspace: state => state.currentWorkspace,
        connected: state => state.connected
    }
});

Vue.use(dbPlugin, { store: store });
Vue.use(serverPlugin, { store: store });

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
                var queryParams = { ...this.$route.query };
                delete queryParams.next;
                return this.$router.push({ path: this.$route.query.next || '/transactions', query: queryParams});
            }
        }
    },
    render: h => h(App),
}).$mount('#app')
