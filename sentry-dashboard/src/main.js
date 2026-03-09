/**
 * @fileoverview Entry point for the standalone Sentry Pipeline Dashboard.
 * Minimal Vue 3 + Vuetify 3 setup with dark theme.
 */

import { createApp } from 'vue';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import '@mdi/font/css/materialdesignicons.css';
import 'vuetify/styles';

import App from './App.vue';
import router from './router.js';

const vuetify = createVuetify({
    components,
    directives,
    theme: {
        defaultTheme: 'dark',
        themes: {
            dark: {
                colors: {
                    background: '#0B1120',
                    surface: '#111827',
                    primary: '#3D95CE',
                    'primary-lighten-1': '#5DAAE0',
                    'primary-darken-1': '#29648E'
                }
            }
        }
    }
});

const app = createApp(App);
app.use(vuetify);
app.use(router);
app.mount('#app');
