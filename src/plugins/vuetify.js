import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { VStepperVertical, VStepperVerticalItem } from 'vuetify/labs/VStepperVertical'

const ethernal = {
    dark: false,
    colors: {
        primary: '#3D95CE',
        secondary: '#424242',
        accent: '#29648E',
        error: '#E72732',
        info: '#2196F3',
        success: '#4CAF50',
        warning: '#E78227',
        background: '#F5F5F5'
    }
};

export default createVuetify({
    components: {
        ...components,
        VStepperVertical,
        VStepperVerticalItem
    },
    directives,
    theme: {
        options: {
            customProperties: true
        },
        defaultTheme: 'ethernal',
        variations: {
            colors: ['primary', 'secondary', 'accent', 'error', 'info', 'success', 'warning', 'background'],
            lighten: 3,
            darken: 3
        },
        themes: { ethernal, light: ethernal, dark: ethernal }
    },
    defaults: {
        VTextField: { color: 'primary', variant: 'outlined' },
        VSelect: { color: 'primary', variant: 'outlined' },
        VTextarea: { color: 'primary', variant: 'outlined' },
        VCheckbox: { color: 'primary', variant: 'outlined' },
        VRadio: { color: 'primary', variant: 'outlined' },
        VSwitch: { color: 'primary', variant: 'outlined' },
        VAutocomplete: { color: 'primary', variant: 'outlined' },
        VCombobox: { color: 'primary', variant: 'outlined' },
        VFileInput: { color: 'primary', variant: 'outlined' },
        VSlider: { color: 'primary', variant: 'outlined' },

        VProgressLinear: { color: 'primary' },

        VBtn: { color: 'primary', variant: 'flat' },

        VStepperVertical: { color: 'primary' },
        VStepperVerticalItem: { color: 'primary' }
    }
});
