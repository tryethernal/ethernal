import Vue from 'vue';
import VueRouter from 'vue-router';
import axios from 'axios';

import vuetify from './plugins/vuetify';
import router from './plugins/router';
import { serverPlugin } from './plugins/server';
import store from './plugins/store';
import { firestorePlugin } from 'vuefire';
import 'ace-mode-solidity/build/remix-ide/mode-solidity.js';

import App from './App.vue';
import DemoExplorer from './components/DemoExplorer.vue';

Vue.config.productionTip = false;
Vue.use(VueRouter);
Vue.use(firestorePlugin);
Vue.use(require('vue-moment'));
Vue.use(serverPlugin, { store: store });

if (store.getters.hasDemoEnabled && window.location.pathname == '/demo') {
    new Vue({
        vuetify,
        store: store,
        render: h => h(DemoExplorer)
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
