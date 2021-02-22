import Vue from 'vue';
import Vuetify from 'vuetify/lib/framework';

Vue.use(Vuetify);

export default new Vuetify({
    theme: {
        options: {
            customProperties: true
        },
        themes: {
            light: {
                primary: '#3D95CE',
                accent: '#29648E',
                warning: '#E78227',
                error: '#E72732',
                background: '#F5F5F5'
            }
        }
    }
});
