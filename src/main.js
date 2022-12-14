import LogRocket from 'logrocket';

import Vue from 'vue';
import VueRouter from 'vue-router';

import vuetify from './plugins/vuetify';
import router from './plugins/router';
import { dbPlugin, auth } from './plugins/firebase';
import { serverPlugin } from './plugins/server';
import store from './plugins/store';
import { firestorePlugin } from 'vuefire';

import App from './App.vue';

Vue.config.productionTip = false;
Vue.use(VueRouter);
Vue.use(firestorePlugin);
Vue.use(require('vue-moment'));

Vue.use(dbPlugin);
Vue.use(serverPlugin, { store: store });

const isEthernalDomain = window.location.host.endsWith(process.env.VUE_APP_MAIN_DOMAIN);

XMLHttpRequest.prototype.realSend = XMLHttpRequest.prototype.send;
const newSend = function(data) {
    XMLHttpRequest.prototype.reqData = data;
    this.realSend(data);
};
XMLHttpRequest.prototype.send = newSend;

if (isEthernalDomain) {
    const splits = window.location.host.split('.');
    const domain = splits[splits.length - 2];
    const publicExplorerSlug = splits.slice(0, splits.indexOf(domain)).join('.');

    if (!publicExplorerSlug.endsWith('app'))
        store.dispatch('updatePublicExplorerSlug', publicExplorerSlug);
}
else {
    store.dispatch('updatePublicExplorerDomain', window.location.host);
}

new Vue({
    vuetify,
    store: store,
    router,
    mounted: function() {
        auth().onAuthStateChanged(this.authStateChanged);
    },
    methods: {
        authStateChanged: function(user) {
            if (user && process.env.VUE_APP_ENABLE_ANALYTICS && window.location.host == 'app.tryethernal.com') {
                LogRocket.init(process.env.VUE_APP_LOGROCKET_ID);
            }

            const currentPath = this.$router.currentRoute.path;
            const isPublicExplorer = store.getters.isPublicExplorer;

            store.dispatch('updateUser', user);
            if (user && !isPublicExplorer)
                store.dispatch('updateCurrentWorkspace', { firebaseUserId: user.uid });

            if (currentPath != '/auth' && !user && !isPublicExplorer) {
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
