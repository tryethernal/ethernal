import path from 'path';
import { defineConfig } from 'vite';
import commonjs from 'vite-plugin-commonjs';
import vue from '@vitejs/plugin-vue'
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import vuetify from 'vite-plugin-vuetify';

export default defineConfig({
    plugins: [
        vue(),
        commonjs(),
        nodePolyfills(),
        vuetify({ autoImport: true }), // Ensure autoImport is set to true
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
});
