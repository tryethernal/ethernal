/**
 * @fileoverview Shared sidebar navigation for developer tool pages.
 * Displays a list of available tools with active state highlighting.
 * On mobile (< 960px), renders as horizontal pill bar.
 * @component ToolsSidebar
 * @prop {String} activeTool - The slug of the currently active tool
 */
<template>
    <div class="tools-sidebar">
        <div class="tools-sidebar-label">DEVELOPER TOOLS</div>
        <nav class="tools-nav">
            <router-link
                v-for="tool in tools"
                :key="tool.slug"
                :to="tool.path"
                :class="['tools-nav-item', { active: activeTool === tool.slug }]"
            >
                <v-icon :icon="tool.icon" size="18" class="mr-2" />
                {{ tool.name }}
            </router-link>
        </nav>
    </div>
</template>

<script setup>
defineProps({
    activeTool: { type: String, required: true }
});

const tools = [
    { slug: 'calldata-decoder', name: 'Calldata Decoder', path: '/tools/calldata-decoder', icon: 'mdi-code-braces' },
    { slug: '4byte-lookup', name: '4byte Lookup', path: '/tools/4byte-lookup', icon: 'mdi-magnify' }
];
</script>

<style scoped>
.tools-sidebar {
    position: sticky;
    top: 100px;
}

.tools-sidebar-label {
    color: var(--text-muted);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    margin-bottom: 12px;
}

.tools-nav {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.tools-nav-item {
    display: flex;
    align-items: center;
    padding: 10px 14px;
    border-radius: 8px;
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 14px;
    transition: all 0.2s;
}

.tools-nav-item:hover {
    color: var(--text-primary);
    background: rgba(61, 149, 206, 0.08);
}

.tools-nav-item.active {
    color: #fff;
    background: rgba(61, 149, 206, 0.2);
    border: 1px solid rgba(61, 149, 206, 0.3);
}

/* Mobile: horizontal pill bar */
@media (max-width: 959px) {
    .tools-sidebar {
        position: static;
        margin-bottom: 24px;
    }
    .tools-sidebar-label {
        display: none;
    }
    .tools-nav {
        flex-direction: row;
        gap: 8px;
        overflow-x: auto;
    }
    .tools-nav-item {
        white-space: nowrap;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 13px;
        border: 1px solid var(--border-subtle);
    }
}
</style>
