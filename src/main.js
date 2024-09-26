import 'vuetify/styles'
import { createApp } from 'vue';
import * as Sentry from "@sentry/vue";

import vuetify from './plugins/vuetify';
import { createPinia } from 'pinia'
import router from './plugins/router';
import demoRouter from './plugins/demoRouter';
import ssoRouter from './plugins/ssoRouter';
import embeddedRouter from './plugins/embeddedRouter';
import serverPlugin from './plugins/server';
import posthogPlugin from "./plugins/posthog";
import pusherPlugin from "./plugins/pusher";
import 'ace-mode-solidity/build/remix-ide/mode-solidity.js';
import dt from './filters/dt';
import FromWei from './filters/FromWei';

import App from './App.vue';
import Demo from './Demo.vue';
import SSO from './SSO.vue';
import Embedded from './Embedded.vue';

const pinia = createPinia();

const createVueApp = (rootComponent, options) => {
    const app = createApp(rootComponent);

    Sentry.init({
        app,
        environment: import.meta.env.MODE,
        release: `ethernal@${import.meta.env.VITE_VERSION}`,
        dsn: `${window.location.protocol}//${import.meta.env.VITE_SENTRY_DSN_SECRET}@${window.location.host}/${import.meta.env.VITE_SENTRY_DSN_PROJECT_ID}`,
        integrations: [
            Sentry.browserTracingIntegration({ router }),
            Sentry.browserProfilingIntegration(),
        ],
        tracesSampleRate: 1.0,
        tracePropagationTargets: [/.*/],
        enabled: false,
    });

    app.use(pinia);
    if (options.router)
        app.use(options.router);
    app.use(vuetify);
    app.use(serverPlugin);
    app.use(posthogPlugin);
    app.use(pusherPlugin);

    app.config.globalProperties.$dt = dt;
    app.config.globalProperties.$fromWei = FromWei;
    return app;
}

if (import.meta.env.VITE_DEMO_ENABLED && window.location.pathname.startsWith('/demo'))
    createVueApp(Demo, { router: demoRouter }).mount('#app');
else if (window.location.pathname.startsWith('/embedded'))
    createVueApp(Embedded, { router: embeddedRouter, provided: { embedded: true } }).mount('#app');
else if (window.location.pathname.endsWith('/sso'))
    createVueApp(SSO, { router: ssoRouter }).mount('#app');
else
    createVueApp(App, { router }).mount('#app');
