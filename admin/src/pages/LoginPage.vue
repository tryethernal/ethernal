<template>
    <v-container class="fill-height" fluid>
        <v-row justify="center">
            <v-col cols="12" sm="6" md="4">
                <v-card>
                    <v-card-title>Admin Login</v-card-title>
                    <v-card-text>
                        <v-form @submit.prevent="handleLogin">
                            <v-text-field v-model="email" label="Email" type="email" required />
                            <v-text-field v-model="password" label="Password" type="password" required />
                            <v-alert v-if="error" type="error" density="compact" class="mb-4">{{ error }}</v-alert>
                            <v-btn type="submit" color="primary" block :loading="loading">Sign In</v-btn>
                        </v-form>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();
const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function handleLogin() {
    loading.value = true;
    error.value = '';
    try {
        await auth.login(email.value, password.value);
        router.push('/prospecting');
    } catch (e) {
        error.value = e.response?.data || 'Login failed';
    } finally {
        loading.value = false;
    }
}
</script>
