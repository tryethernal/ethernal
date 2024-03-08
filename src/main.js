import Vue from 'vue';
import VueRouter from 'vue-router';
import axios from 'axios';

import vuetify from './plugins/vuetify';
import router from './plugins/router';
import demoRouter from './plugins/demoRouter';
import ssoRouter from './plugins/ssoRouter';
import { serverPlugin } from './plugins/server';
import store from './plugins/store';
import posthogPlugin from "./plugins/posthog";
import { firestorePlugin } from 'vuefire';
import 'ace-mode-solidity/build/remix-ide/mode-solidity.js';

import App from './App.vue';
import Demo from './Demo.vue';
import SSO from './SSO.vue';

Vue.config.productionTip = false;
Vue.use(VueRouter);
Vue.use(firestorePlugin);
Vue.use(require('vue-moment'));
Vue.use(serverPlugin, { store });

if (store.getters.hasAnalyticsEnabled)
    Vue.use(posthogPlugin, { store });

if (store.getters.hasDemoEnabled && window.location.pathname.startsWith('/demo')) {
    new Vue({
        vuetify,
        store: store,
        router: demoRouter,
        render: h => h(Demo)
    }).$mount('#app');
}
else if (window.location.pathname.endsWith('/sso')) {
    new Vue({
        vuetify,
        store: store,
        router: ssoRouter,
        render: h => h(SSO)
    }).$mount('#app');
}
else {
    axios.get(`${store.getters.apiRoot}/api/explorers/search?domain=${window.location.host}`)
        .then(({ data }) => {
            if (data.explorer)
                store.dispatch('setPublicExplorerData', data.explorer);
            new Vue({
                vuetify,
                store: store,
                router,
                render: h => h(App)
            }).$mount('#app');
        })
        .catch(() => document.location.href = `//app.${process.env.VUE_APP_MAIN_DOMAIN}`);
}
