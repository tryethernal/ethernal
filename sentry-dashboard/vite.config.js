import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
    base: '/sentry-dashboard/',
    plugins: [
        vue(),
        vuetify({ autoImport: true })
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    },
    server: {
        proxy: {
            '/api': {
                target: process.env.VITE_API_PROXY_TARGET || 'http://backend:8888',
                changeOrigin: true,
                auth: process.env.SENTRY_DASHBOARD_CREDENTIALS || 'admin:admin'
            },
            '/app': {
                target: process.env.VITE_WS_PROXY_TARGET || 'ws://soketi:6001',
                ws: true
            }
        }
    },
    build: {
        chunkSizeWarningLimit: 600,
        rollupOptions: {
            output: {
                manualChunks: {
                    vue: ['vue', 'vue-router'],
                    vuetify: ['vuetify']
                }
            }
        }
    }
});
