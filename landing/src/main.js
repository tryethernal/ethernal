import { createApp } from 'vue';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css';
import './styles/landing.scss';

import App from './App.vue';
import router from './router.js';

const vuetify = createVuetify({
    components,
    directives,
    theme: {
        defaultTheme: 'dark',
        themes: {
            dark: {
                dark: true,
                colors: {
                    primary: '#3D95CE',
                    secondary: '#94A3B8',
                    accent: '#5DAAE0',
                    error: '#EF4444',
                    info: '#3B82F6',
                    success: '#22C55E',
                    warning: '#F59E0B',
                    background: '#0B1120',
                    surface: '#111827',
                    'surface-variant': '#1a2234',
                    'on-background': '#F1F5F9',
                    'on-surface': '#F1F5F9'
                }
            }
        }
    },
    defaults: {
        VBtn: { rounded: 'lg' },
        VCard: { flat: true, rounded: 'xl', color: 'transparent' },
        VTextField: { color: 'primary', variant: 'outlined' }
    }
});

const app = createApp(App);
app.use(vuetify);
app.use(router);
app.mount('#app');
