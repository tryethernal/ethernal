import 'vuetify/styles'
import { createApp } from 'vue/dist/vue.esm-bundler';
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

import dt from './filters/dt';
import FromWei from './filters/FromWei';

import userMixin from './mixins/user';

import App from './App.vue';
import Demo from './Demo.vue';
import SSO from './SSO.vue';
import Embedded from './Embedded.vue';
import SetupRoot from './SetupRoot.vue';
import setupRouter from './plugins/setupRouter';

const pinia = createPinia();

const isSentryConfigured = import.meta.env.VITE_SENTRY_DSN_SECRET &&
    import.meta.env.VITE_SENTRY_DSN_PROJECT_ID &&
    import.meta.env.VITE_SENTRY_AUTH_TOKEN &&
    import.meta.env.VITE_SENTRY_ORG &&
    import.meta.env.VITE_SENTRY_PROJECT &&
    import.meta.env.VITE_SENTRY_URL;

const createVueApp = (rootComponent, options) => {
    const app = createApp(rootComponent);

    if (isSentryConfigured) {
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
            enabled: import.meta.env.VITE_SENTRY_ENABLED
        });
    }

    function createPiniaGlobalPlugin(app) {
        return () => ({ globalProperties: app.config.globalProperties });
    }
    pinia.use(createPiniaGlobalPlugin(app));

    app.use(pinia);
    if (options.router)
        app.use(options.router);
    app.use(vuetify);
    app.use(serverPlugin);
    app.use(posthogPlugin);
    app.use(pusherPlugin);

    app.mixin(userMixin);

    app.config.globalProperties.$dt = dt;
    app.config.globalProperties.$fromWei = FromWei;

    app.provide('$dt', dt);
    app.provide('$fromWei', FromWei);
    app.provide('$router', router);

    return app;
}

if (!import.meta.env.VITE_IS_SELF_HOSTED && window.location.pathname.startsWith('/demo'))
    createVueApp(Demo, { router: demoRouter }).mount('#app');
else if (window.location.pathname.startsWith('/embedded') && !import.meta.env.VITE_IS_SELF_HOSTED)
    createVueApp(Embedded, { router: embeddedRouter, provided: { embedded: true } }).mount('#app');
else if (window.location.pathname.endsWith('/sso'))
    createVueApp(SSO, { router: ssoRouter }).mount('#app');
else if (window.location.pathname.startsWith('/setup') && import.meta.env.VITE_IS_SELF_HOSTED)
    createVueApp(SetupRoot, { router: setupRouter }).mount('#app');
else
    createVueApp(App, { router }).mount('#app');
