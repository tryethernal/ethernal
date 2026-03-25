<template>
    <v-app>
        <v-app-bar density="compact" color="surface">
            <v-app-bar-title>Ethernal Admin</v-app-bar-title>
            <template v-if="auth.isLoggedIn" #append>
                <v-btn variant="text" to="/prospecting">Queue</v-btn>
                <v-btn variant="text" to="/prospecting/pipeline">Pipeline</v-btn>
                <v-btn variant="text" @click="auth.logout()">Logout</v-btn>
            </template>
        </v-app-bar>
        <v-main>
            <router-view />
        </v-main>
    </v-app>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth';
const auth = useAuthStore();
</script>
