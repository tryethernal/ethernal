<template>
    <ApiReference :configuration="configuration" />
</template>

<script setup>
/**
 * @fileoverview Scalar API reference viewer, browser-only.
 * Scalar relies on browser APIs, so this component must never be rendered during SSG. Load it through
 * `defineAsyncComponent` inside `<ClientOnly>` so that Scalar and its stylesheet stay in a separate, client-side chunk.
 * @component ApiReferenceViewer
 * @prop {String} url - URL of the OpenAPI document to render.
 */
import { computed } from 'vue';
import { ApiReference } from '@scalar/api-reference';
import '@scalar/api-reference/style.css';

const props = defineProps({
    url: { type: String, required: true }
});

const configuration = computed(() => ({
    url: props.url,
    forceDarkModeState: 'dark',
    hideDarkModeToggle: true,
    withDefaultFonts: false,
    customCss: `
        .dark-mode {
            --scalar-color-accent: #5DAAE0;
            --scalar-background-1: #0B1120;
            --scalar-background-2: #111827;
            --scalar-background-3: #151D2E;
            --scalar-border-color: rgba(61, 149, 206, 0.22);
        }
        .dark-mode .t-doc__sidebar { --scalar-sidebar-background-1: #0B1120; }
    `
}));
</script>
