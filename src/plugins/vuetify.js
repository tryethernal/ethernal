import { createVuetify } from 'vuetify'

export default createVuetify({
    theme: {
        options: {
            customProperties: true
        },
        themes: {
            light: {
                primary: '#3D95CE',
                secondary: '#424242',
                accent: '#29648E',
                error: '#E72732',
                info: '#2196F3',
                success: '#4CAF50',
                warning: '#E78227',
                background: '#F5F5F5'
            }
        }
    }
});
