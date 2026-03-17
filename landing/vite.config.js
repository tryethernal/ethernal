import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';
import { fileURLToPath, URL } from 'node:url';
import { generateSitemap } from './src/sitemap.js';

export default defineConfig({
    define: {
        'import.meta.env.VITE_APP_URL': JSON.stringify(process.env.VITE_APP_URL || 'https://app.tryethernal.com')
    },
    plugins: [
        vue(),
        vuetify({ autoImport: true })
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    },
    ssr: {
        noExternal: ['vuetify']
    },
    ssgOptions: {
        script: 'async',
        formatting: 'minify',
        onFinished() {
            const routes = [
                '/', '/pricing', '/features', '/developers', '/teams',
                '/transaction-tracing', '/app-chains',
                '/hardhat-block-explorer', '/anvil-block-explorer', '/ganache-block-explorer',
                '/op-stack', '/arbitrum-orbit', '/kaleido', '/chainstack', '/github-actions',
                '/contact-us', '/terms', '/privacy',
            ];
            generateSitemap(routes, './dist');
        }
    },
    build: {
        chunkSizeWarningLimit: 600
    }
});
