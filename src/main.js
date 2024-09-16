import Vue from 'vue';
import VueRouter from 'vue-router';
import * as Sentry from "@sentry/vue";

import vuetify from './plugins/vuetify';
import { createPinia } from 'pinia'
import { useEnvStore } from './stores/env';
import router from './plugins/router';
import demoRouter from './plugins/demoRouter';
import ssoRouter from './plugins/ssoRouter';
import { serverPlugin } from './plugins/server';
import posthogPlugin from "./plugins/posthog";
import { firestorePlugin } from 'vuefire';
import 'ace-mode-solidity/build/remix-ide/mode-solidity.js';

import App from './App.vue';
import Demo from './Demo.vue';
import SSO from './SSO.vue';

const pinia = createPinia();

Vue.config.productionTip = false;
Vue.use(VueRouter);
Vue.use(firestorePlugin);
Vue.use(require('vue-moment'));
Vue.use(serverPlugin);
Vue.use(posthogPlugin);
Vue.use(pinia);

const envStore = useEnvStore();

Sentry.init({
    Vue,
    environment: envStore.environment,
    release: `ethernal@${envStore.version}`,
    dsn: envStore.sentryDSN,
    integrations: [
        Sentry.browserTracingIntegration({ router }),
        Sentry.browserProfilingIntegration(),
    ],
    tracesSampleRate: 1.0,
    tracePropagationTargets: [/.*/]
});

if (envStore.hasDemoEnabled() && window.location.pathname.startsWith('/demo')) {
    new Vue({
        vuetify,
        router: demoRouter,
        render: h => h(Demo)
    }).$mount('#app');
}
else if (window.location.pathname.endsWith('/sso')) {
    new Vue({
        vuetify,
        router: ssoRouter,
        render: h => h(SSO)
    }).$mount('#app');
}
else {
    new Vue({
        vuetify,
        router,
        render: h => h(App)
    }).$mount('#app');
}
