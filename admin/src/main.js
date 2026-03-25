import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import '@mdi/font/css/materialdesignicons.css';
import 'vuetify/styles';
import router from './router';
import App from './App.vue';

const vuetify = createVuetify({
    components,
    directives,
    theme: {
        defaultTheme: 'dark',
        themes: {
            dark: { colors: { primary: '#3D95CE' } }
        }
    }
});

const app = createApp(App);
app.use(createPinia());
app.use(vuetify);
app.use(router);
app.mount('#app');
