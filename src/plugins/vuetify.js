import '@/styles/main.scss';
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { VStepperVertical, VStepperVerticalItem } from 'vuetify/labs/VStepperVertical'
import { VTreeview } from 'vuetify/labs/VTreeview'
import { iconify } from './iconify';

const lightTheme = {
    dark: false,
    colors: {
        primary: '#3D95CE',
        secondary: '#424242',
        accent: '#29648E',
        error: '#E72732',
        info: '#2196F3',
        success: '#4CAF50',
        warning: '#E78227',
        background: '#F5F5F5',
        'gas-slow': '#4CAF50',
        'gas-average': '#3D95CE',
        'gas-fast': '#E72732'
    }
};

const darkTheme = {
    dark: true,
    colors: {
        primary: '#5DAAE0', // Lighter blue for better contrast in dark mode
        secondary: '#616161',
        accent: '#4A85AE',
        error: '#FF5252',
        info: '#64B5F6',
        success: '#81C784',
        warning: '#FFB74D',
        background: '#121212',
        'gas-slow': '#4CAF50',
        'gas-average': '#3D95CE',
        'gas-fast': '#E72732'
    }
};

export default createVuetify({
    components: {
        ...components,
        VStepperVertical,
        VStepperVerticalItem,
        VTreeview
    },
    icons: {
        sets: {
            arcticons: iconify('arcticons')
        }
    },
    directives,
    theme: {
        options: {
            customProperties: true
        },
        defaultTheme: 'light',
        themes: {
            light: lightTheme,
            dark: darkTheme
        }
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
        VCard: { border: 'primary thin', flat: true, rounded: 'lg' },

        VProgressLinear: { color: 'primary' },

        VBtn: { color: 'primary', variant: 'flat' },

        VStepperVertical: { color: 'primary' },
        VStepperVerticalItem: { color: 'primary' }
    }
});
