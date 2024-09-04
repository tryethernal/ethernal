import path from 'path';
import { defineConfig } from 'vite';
import { createVuePlugin as vue } from 'vite-plugin-vue2';
import commonjs from 'vite-plugin-commonjs';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import vuetify from 'vite-plugin-vuetify';

export default defineConfig({
    plugins: [
        vue(),
        commonjs(),
        nodePolyfills(),
        vuetify({ autoImport: true }), // Set autoImport to true to correctly load Vuetify components
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
        extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue'],
    },
    server: {
        host: '0.0.0.0',
        port: 8080,
    },
    define: {
        global: 'globalThis',
    },
})
