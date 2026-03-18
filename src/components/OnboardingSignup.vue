<!--
    @fileoverview OnboardingSignup component — step 3 of the onboarding wizard (public path).
    Renders an email + password form and calls the atomic onboarding endpoint via $server.onboardingSetup().
    @component OnboardingSignup
    @prop {String} path - Onboarding path ('public' or 'private').
    @prop {Object} setupData - Collected data from previous steps (name, rpcServer, workspaceName, chain).
    @emits signup-complete - Emitted with the API response data on successful account creation.
    @emits back - Emitted when the user clicks the Back button.
-->
<template>
    <div class="onboarding-signup">
        <h2 class="text-h5 font-weight-bold mb-2">Create your account</h2>
        <p class="text-body-2 text-medium-emphasis mb-8">One last step to get your {{ path === 'public' ? 'explorer' : 'workspace' }} running.</p>

        <v-form @submit.prevent="submit" v-model="formValid" style="max-width: 400px; margin: 0 auto;">
            <v-text-field
                v-model="email"
                label="Email"
                type="email"
                variant="outlined"
                rounded="lg"
                :rules="[v => !!v || 'Email is required', v => /.+@.+\..+/.test(v) || 'Invalid email']"
                class="mb-4"
                :disabled="loading"
                autocomplete="email"
            />
            <v-text-field
                v-model="password"
                label="Password"
                type="password"
                variant="outlined"
                rounded="lg"
                :rules="[v => !!v || 'Password is required', v => v.length >= 6 || 'At least 6 characters']"
                class="mb-2"
                :disabled="loading"
                autocomplete="new-password"
            />

            <v-alert
                v-if="errorMsg"
                type="error"
                variant="tonal"
                rounded="lg"
                class="mb-4"
                density="compact"
            >
                {{ errorMsg }}
            </v-alert>

            <div class="d-flex justify-space-between mt-6">
                <v-btn variant="text" @click="$emit('back')" :disabled="loading">
                    <v-icon start>mdi-arrow-left</v-icon>
                    Back
                </v-btn>
                <v-btn
                    color="primary"
                    size="large"
                    rounded="xl"
                    type="submit"
                    :loading="loading"
                    :disabled="!formValid"
                >
                    Create Account
                    <v-icon end>mdi-arrow-right</v-icon>
                </v-btn>
            </div>

            <p class="text-body-2 text-medium-emphasis text-center mt-6">
                Already have an account?
                <router-link to="/auth" class="text-primary">Sign in</router-link>
            </p>
        </v-form>
    </div>
</template>

<script setup>
import { ref, getCurrentInstance } from 'vue';

const props = defineProps({
    /** Onboarding path: 'public' for hosted explorer, 'private' for local workspace. */
    path: { type: String, required: true },
    /** Data collected in previous onboarding steps (name, rpcServer, workspaceName, chain). */
    setupData: { type: Object, default: () => ({}) }
});

const emit = defineEmits(['signup-complete', 'back']);

const { proxy } = getCurrentInstance();

const email = ref('');
const password = ref('');
const formValid = ref(false);
const loading = ref(false);
const errorMsg = ref('');

/**
 * Submits the signup form.
 * Reads onboarding context from sessionStorage, calls the atomic onboarding endpoint,
 * and emits signup-complete with the API response on success.
 * @returns {Promise<void>}
 */
async function submit() {
    if (!formValid.value) return;
    loading.value = true;
    errorMsg.value = '';

    try {
        const onboardingContext = JSON.parse(sessionStorage.getItem('onboardingContext') || '{}');

        const { data } = await proxy.$server.onboardingSetup({
            email: email.value,
            password: password.value,
            path: props.path,
            explorerName: props.setupData.name,
            rpcServer: props.setupData.rpcServer,
            workspaceName: props.setupData.workspaceName,
            chain: props.setupData.chain,
            source: onboardingContext.source || 'direct',
            flow: onboardingContext.flow || props.path,
            chainParam: onboardingContext.chain || null
        });

        emit('signup-complete', data);
    } catch (error) {
        errorMsg.value = error.response?.data || error.message || 'Something went wrong. Please try again.';
    } finally {
        loading.value = false;
    }
}
</script>
