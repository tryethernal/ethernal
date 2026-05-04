import { ViteSSG } from 'vite-ssg';
import { createVuetify } from 'vuetify';
import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css';
import './styles/landing.scss';

import App from './App.vue';
import { routes, scrollBehavior } from './router.js';

export const createApp = ViteSSG(
    App,
    {
        routes,
        scrollBehavior
    },
    ({ app, router, isClient }) => {
        const vuetify = createVuetify({
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

        app.use(vuetify);

        // Browser-only: PostHog analytics
        if (isClient) {
            import('posthog-js').then(({ default: posthog }) => {
                posthog.init('phc_W1H8OCkSPHM7iP8fxwINcnV5CkVpLj6i6yzwQfsCAtC', {
                    api_host: '/ingest',
                    ui_host: 'https://us.posthog.com',
                    person_profiles: 'identified_only',
                    capture_pageview: false,
                    capture_pageleave: true,
                    autocapture: true,
                    ip: true
                });

                window.posthog = posthog;
                app.config.globalProperties.$posthog = posthog;

                router.afterEach((to) => {
                    posthog.capture('$pageview', {
                        $current_url: window.location.origin + to.fullPath
                    });
                });
            });
        }
    }
);
