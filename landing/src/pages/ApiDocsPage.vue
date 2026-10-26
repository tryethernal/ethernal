<template>
    <LandingLayout>
        <div class="api-docs-page">
            <ClientOnly>
                <ApiReferenceViewer :url="openApiUrl" />
                <template #placeholder>
                    <div class="api-docs-loading">Loading the API reference...</div>
                </template>
            </ClientOnly>
        </div>
    </LandingLayout>
</template>

<script setup>
/**
 * @fileoverview Central API reference page (/docs/api).
 * Renders the OpenAPI document served by the Ethernal backend with Scalar. Scalar is browser-only, so it is
 * loaded client-side (through the global vite-ssg `ClientOnly` component) and the page is prerendered as a shell.
 * Readers set the `explorerDomain` server variable in the request client to query a specific explorer.
 * @component ApiDocsPage
 */
import { defineAsyncComponent } from 'vue';
import { useHead } from '@vueuse/head';
import LandingLayout from '@/components/LandingLayout.vue';

const ApiReferenceViewer = defineAsyncComponent(() => import('@/components/ApiReferenceViewer.vue'));

const openApiUrl = `${__APP_URL__}/api/openapi.json`;

const title = 'Block Explorer API Reference | Ethernal';
const description = 'REST and Etherscan-compatible API for every Ethernal public explorer. Query blocks, transactions, addresses, tokens and L2 data, with an interactive OpenAPI reference.';

useHead({
    title,
    meta: [
        { name: 'description', content: description },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:url', content: 'https://tryethernal.com/docs/api' },
        { name: 'twitter:card', content: 'summary_large_image' }
    ],
    link: [
        { rel: 'canonical', href: 'https://tryethernal.com/docs/api' }
    ]
});
</script>

<style scoped>
.api-docs-page {
    /* Clears the fixed landing navbar (64px) */
    padding-top: 64px;
    min-height: 100vh;
    --scalar-custom-header-height: 64px;
}

.api-docs-loading {
    padding: 120px 24px;
    text-align: center;
    color: var(--text-secondary);
}
</style>
