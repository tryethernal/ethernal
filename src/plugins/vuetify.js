import Vue from 'vue';
import Vuetify from 'vuetify/lib/framework';

Vue.use(Vuetify);

export default new Vuetify({
    theme: {
        themes: {
            light: {
                primary: '#3D95CE',
                accent: '#29648E',
                success: '#27E73',
                warning: '#E78227',
                error: '#E72732',
            }
        }
    }
});
