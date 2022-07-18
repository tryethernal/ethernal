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

Vue.use(dbPlugin, { store: store });
Vue.use(serverPlugin, { store: store });

const isEthernalDomain = window.location.host.endsWith(process.env.VUE_APP_MAIN_DOMAIN);

if (isEthernalDomain) {
    const splits = window.location.host.split('.');
    const domain = splits[splits.length - 2];
    const publicExplorerSlug = splits.slice(0, splits.indexOf(domain)).join('.');
    console.log(publicExplorerSlug)
    if (publicExplorerSlug != 'app')
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

            var currentPath = this.$router.currentRoute.path;

            store.dispatch('updateUser', user);

            if (user)
                store.dispatch('updateCurrentWorkspace', { firebaseUserId: user.uid });

            const isPublicExplorer = store.getters.isPublicExplorer;
            if (currentPath != '/auth' && !user && !isPublicExplorer) {
                return this.$router.push('/auth');
            }
            if (currentPath == '/auth' && user) {
                var queryParams = { ...this.$route.query };
                delete queryParams.next;
                return this.$router.push({ path: this.$route.query.next || '/transactions', query: queryParams});
            }
        }
    },
    render: h => h(App)
}).$mount('#app')
