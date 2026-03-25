import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';
import { fileURLToPath } from 'url';

export default defineConfig({
    base: '/admin/',
    plugins: [vue(), vuetify({ autoImport: true })],
    resolve: {
        alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
    },
    server: {
        proxy: {
            '/api': { target: 'http://backend:8888', changeOrigin: true }
        }
    }
});
