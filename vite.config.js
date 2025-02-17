import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import commonjs from 'vite-plugin-commonjs';
import vue from '@vitejs/plugin-vue'
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import vuetify from 'vite-plugin-vuetify';

export default ({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    return defineConfig({
        build: {
            minify: 'terser'
        },
        plugins: [
            vue(),
            commonjs(),
            nodePolyfills(),
            vuetify({ autoImport: true })
        ],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
            extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue'],
        },
        server: {
            allowedHosts: true,
            host: '0.0.0.0',
            port: 8080,
            headers: {
                'Document-Policy': 'js-profiling'
            },
            proxy: {
                '^/api/[1-9]\\d*/(envelope|minidump|security|store)/': env.VITE_SENTRY_URL
            }
        },
        define: {
            global: 'globalThis',
        },
    })
};
