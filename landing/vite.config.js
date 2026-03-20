import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';
import { fileURLToPath, URL } from 'node:url';
import { readFileSync } from 'node:fs';
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
            const routerSrc = readFileSync(new URL('./src/router.js', import.meta.url), 'utf-8');
            const routePaths = [...routerSrc.matchAll(/path:\s*'([^']+)'/g)].map(m => m[1]);
            generateSitemap(routePaths, './dist');
        }
    },
    server: {
        allowedHosts: true,
        watch: {
            usePolling: true,
            interval: 1000
        }
    },
    build: {
        chunkSizeWarningLimit: 600
    }
});
