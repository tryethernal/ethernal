import path from 'path';
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
    plugins: [vue()],
    test: {
        env: false,
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./tests/setup.js'],
        include: ['tests/**/*.spec.js'],
        exclude: ['run/**', 'node_modules/**'],
        server: {
            deps: {
                inline: ['vuetify', '@web3-onboard/wagmi']
            }
        }
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    }
});
