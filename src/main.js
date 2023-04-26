import LogRocket from 'logrocket';

import Vue from 'vue';
import VueRouter from 'vue-router';

import vuetify from './plugins/vuetify';
import router from './plugins/router';
import { serverPlugin } from './plugins/server';
import store from './plugins/store';
import { firestorePlugin } from 'vuefire';

import App from './App.vue';

Vue.config.productionTip = false;
Vue.use(VueRouter);
Vue.use(firestorePlugin);
Vue.use(require('vue-moment'));

Vue.use(serverPlugin, { store: store });

const isEthernalDomain = window.location.host.endsWith(process.env.VUE_APP_MAIN_DOMAIN);

if (isEthernalDomain) {
    const splitDomain = window.location.host.split('.')
    // URL needs to start with app and must be at least a subdomain
    if(!window.location.host.startsWith('app.')
        && splitDomain.length > 2) {
        store.dispatch('updatePublicExplorerSlug', splitDomain[0]);
    }
}
else {
    store.dispatch('updatePublicExplorerDomain', window.location.host);
}

new Vue({
    vuetify,
    store: store,
    router,
    mounted() {
        if (!store.getters.publicExplorerMode)
            this.server.getCurrentUser()
                .then(({ data }) => this.authStateChanged(data))
                .catch(() => this.authStateChanged(null))
        else
            this.authStateChanged(null);
    },
    methods: {
        authStateChanged(user) {
            if (user && process.env.VUE_APP_ENABLE_ANALYTICS && window.location.host == 'app.tryethernal.com') {
                LogRocket.init(process.env.VUE_APP_LOGROCKET_ID);
            }

            const currentPath = this.$router.currentRoute.path;
            const publicExplorerMode = store.getters.publicExplorerMode;

            store.dispatch('updateUser', user || {});

            if (currentPath != '/auth' && !user && !publicExplorerMode) {
                return this.$router.push('/auth');
            }
            if (currentPath == '/auth' && user) {
                const queryParams = { ...this.$route.query };
                delete queryParams.next;
                return this.$router.push({ path: this.$route.query.next || '/transactions', query: queryParams});
            }
        }
    },
    render: h => h(App)
}).$mount('#app')
