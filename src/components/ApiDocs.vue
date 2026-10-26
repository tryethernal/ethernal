<template>
    <div class="api-docs" v-if="isPublicExplorer">
        <ApiReference :key="themeKey" :configuration="configuration" />
    </div>
</template>

<script setup>
/**
 * @fileoverview Interactive API reference for the current public explorer.
 * Renders the OpenAPI document served by the backend (`/api/openapi.json`) with Scalar.
 * Only meaningful on a public explorer host: in dashboard mode (no explorer) it sends the visitor
 * to the central reference on the marketing site instead.
 * This component is lazy-loaded by the router, so Scalar and its stylesheet are not part of the main bundle.
 * @component ApiDocs
 */
import { computed, onBeforeUnmount } from 'vue';
import { useTheme } from 'vuetify';
import { ApiReference } from '@scalar/api-reference';
import '@scalar/api-reference/style.css';
import { useExplorerStore } from '@/stores/explorer';

const CENTRAL_DOCS_URL = 'https://tryethernal.com/docs/api';

const explorerStore = useExplorerStore();
const theme = useTheme();

const isPublicExplorer = computed(() => !!explorerStore.id);

if (!isPublicExplorer.value)
    window.location.replace(CENTRAL_DOCS_URL);

const isDark = computed(() => !!theme.global.current.value.dark);
const accentColor = computed(() => theme.global.current.value.colors.primary);
const themeKey = computed(() => `${isDark.value ? 'dark' : 'light'}-${accentColor.value}`);

const configuration = computed(() => ({
    url: '/api/openapi.json',
    forceDarkModeState: isDark.value ? 'dark' : 'light',
    hideDarkModeToggle: true,
    withDefaultFonts: false,
    customCss: `.light-mode, .dark-mode { --scalar-color-accent: ${accentColor.value}; }`
}));

// Scalar toggles `light-mode` / `dark-mode` on <body>. The app only uses `dark-mode`, so put it back in line with the app theme.
onBeforeUnmount(() => {
    document.body.classList.remove('light-mode');
    document.body.classList.toggle('dark-mode', isDark.value);
});
</script>

<style scoped>
.api-docs {
    min-height: 100%;
}
</style>
