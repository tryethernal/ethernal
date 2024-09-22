import Vue from 'vue';
import VueRouter from 'vue-router';
import * as Sentry from "@sentry/vue";

import vuetify from './plugins/vuetify';
import router from './plugins/router';
import demoRouter from './plugins/demoRouter';
import ssoRouter from './plugins/ssoRouter';
import embeddedRouter from './plugins/embeddedRouter';
import { serverPlugin } from './plugins/server';
import store from './plugins/store';
import posthogPlugin from "./plugins/posthog";
import { firestorePlugin } from 'vuefire';
import 'ace-mode-solidity/build/remix-ide/mode-solidity.js';

import App from './App.vue';
import Demo from './Demo.vue';
import SSO from './SSO.vue';
import Embedded from './Embedded.vue';

Vue.config.productionTip = false;
Vue.use(VueRouter);
Vue.use(firestorePlugin);
Vue.use(require('vue-moment'));
Vue.use(serverPlugin, { store });
Vue.use(posthogPlugin, { store });

Sentry.init({
    Vue,
    environment: store.getters.environment,
    release: `ethernal@${store.getters.version}`,
    dsn: store.getters.sentryDSN,
    integrations: [
        Sentry.browserTracingIntegration({ router }),
        Sentry.browserProfilingIntegration(),
    ],
    tracesSampleRate: 1.0,
    tracePropagationTargets: [/.*/]
});

if (store.getters.hasDemoEnabled && window.location.pathname.startsWith('/demo')) {
    new Vue({
        vuetify,
        store: store,
        router: demoRouter,
        render: h => h(Demo)
    }).$mount('#app');
}
else if (window.location.pathname.startsWith('/embedded')) {
    new Vue({
        vuetify,
        store: store,
        router: embeddedRouter,
        render: h => h(Embedded)
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
    new Vue({
        vuetify,
        store: store,
        router,
        render: h => h(App)
    }).$mount('#app');
}
