/**
 * @fileoverview Root App component for the Sentry Dashboard.
 * Minimal top bar with Live and History navigation tabs.
 * @component App
 */
<template>
    <v-app>
        <v-app-bar density="compact" color="#0B1120" flat class="app-bar">
            <v-app-bar-title class="text-body-1 font-weight-medium ml-2">
                <v-icon size="small" class="mr-1">mdi-console</v-icon>
                Sessions
            </v-app-bar-title>
            <template v-slot:append>
                <v-btn :to="{ name: 'live' }" size="small" variant="text" :class="{ 'text-primary': $route.name === 'live' }">
                    <v-icon start size="small">mdi-console</v-icon>Live
                </v-btn>
                <v-btn :to="{ name: 'history' }" size="small" variant="text" :class="{ 'text-primary': $route.name === 'history' }">
                    <v-icon start size="small">mdi-history</v-icon>History
                </v-btn>
            </template>
        </v-app-bar>
        <v-main>
            <router-view />
        </v-main>
    </v-app>
</template>

<style scoped>
.app-bar {
    border-bottom: 1px solid rgba(61, 149, 206, 0.15) !important;
}
</style>
