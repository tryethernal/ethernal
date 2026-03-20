<!--
    @fileoverview Signup step for onboarding wizard.
    Creates account via atomic onboarding endpoint, or signs in to existing account.
    @component OnboardingSignup
    @emits signup-complete - Emitted with { user, workspace, explorer?, authToken }
    @emits signin-complete - Emitted with { user } when signing in to existing account
    @emits back - Emitted when user clicks back
-->
<template>
    <div class="onboarding-signup">
        <div class="step-label">Step 3 of 4</div>
        <h2 class="step-title">{{ mode === 'signup' ? 'Create your account' : 'Sign in' }}</h2>
        <p class="step-subtitle">{{ mode === 'signup' ? `One last step to get your ${path === 'public' ? 'explorer' : 'workspace'} running.` : 'Welcome back! Sign in to continue.' }}</p>

        <v-form @submit.prevent="submit" v-model="formValid">
            <div class="field-group">
                <label class="field-label">Email</label>
                <v-text-field
                    v-model="email"
                    type="email"
                    placeholder="you@company.com"
                    variant="outlined"
                    rounded="lg"
                    density="comfortable"
                    :rules="[v => !!v || 'Email is required', v => /.+@.+\..+/.test(v) || 'Invalid email']"
                    :disabled="loading"
                    autocomplete="email"
                    bg-color="rgba(255,255,255,0.03)"
                    hide-details="auto"
                />
            </div>

            <div class="field-group">
                <label class="field-label">Password</label>
                <v-text-field
                    v-model="password"
                    type="password"
                    placeholder="At least 6 characters"
                    variant="outlined"
                    rounded="lg"
                    density="comfortable"
                    :rules="[v => !!v || 'Password is required', v => v.length >= 6 || 'At least 6 characters']"
                    :disabled="loading"
                    autocomplete="new-password"
                    bg-color="rgba(255,255,255,0.03)"
                    hide-details="auto"
                />
            </div>

            <v-slide-y-transition>
                <div v-if="errorMsg" class="error-msg">
                    <v-icon size="16" color="#EF4444">mdi-alert-circle</v-icon>
                    <span>{{ errorMsg }}</span>
                </div>
            </v-slide-y-transition>

            <div class="step-actions">
                <button type="button" class="back-btn" @click="$emit('back')" :disabled="loading">
                    <v-icon size="16">mdi-arrow-left</v-icon> Back
                </button>
                <v-btn
                    color="#3D95CE"
                    size="large"
                    rounded="lg"
                    type="submit"
                    :loading="loading"
                    :disabled="!formValid"
                    class="continue-btn"
                >
                    {{ mode === 'signup' ? 'Create Account' : 'Sign In' }}
                    <v-icon end>mdi-arrow-right</v-icon>
                </v-btn>
            </div>
        </v-form>

        <div class="signup-footer">
            <template v-if="mode === 'signup'">
                Already have an account? <a href="#" class="wizard-link" @click.prevent="mode = 'signin'">Sign in</a>
            </template>
            <template v-else>
                Don't have an account? <a href="#" class="wizard-link" @click.prevent="mode = 'signup'">Sign up</a>
            </template>
        </div>
    </div>
</template>

<script setup>
import { ref, getCurrentInstance } from 'vue';

const props = defineProps({
    path: { type: String, required: true },
    setupData: { type: Object, default: () => ({}) }
});

const emit = defineEmits(['signup-complete', 'signin-complete', 'back']);
const { proxy } = getCurrentInstance();

const mode = ref('signup');
const email = ref('');
const password = ref('');
const formValid = ref(false);
const loading = ref(false);
const errorMsg = ref('');

async function submit() {
    if (!formValid.value) return;
    loading.value = true;
    errorMsg.value = '';

    try {
        if (mode.value === 'signin') {
            const { data: { user } } = await proxy.$server.signIn(email.value, password.value);
            emit('signin-complete', { user });
            return;
        }

        const onboardingContext = JSON.parse(sessionStorage.getItem('onboardingContext') || '{}');

        const { data } = await proxy.$server.onboardingSetup({
            email: email.value,
            password: password.value,
            path: props.path,
            explorerName: props.setupData.name,
            rpcServer: props.setupData.rpcServer,
            workspaceName: props.setupData.workspaceName,
            chain: props.setupData.chain,
            networkId: props.setupData.networkId || null,
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

<style scoped>
.step-label {
    font-size: 12px;
    color: #3D95CE;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 8px;
}

.step-title {
    font-size: 24px;
    font-weight: 700;
    color: #fff;
    margin-bottom: 6px;
}

.step-subtitle {
    font-size: 14px;
    color: #64748b;
    margin-bottom: 28px;
}

.field-group {
    margin-bottom: 20px;
}

.field-label {
    font-size: 13px;
    color: #94a3b8;
    display: block;
    margin-bottom: 6px;
    font-weight: 500;
}

.error-msg {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 8px;
    margin-bottom: 20px;
    color: #EF4444;
    font-size: 13px;
}

.step-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 28px;
}

.back-btn {
    background: none;
    border: none;
    color: #64748b;
    font-size: 13px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px 0;
    transition: color 0.2s;
}

.back-btn:hover:not(:disabled) {
    color: #94a3b8;
}

.back-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.continue-btn {
    text-transform: none;
    font-weight: 600;
    letter-spacing: 0;
}

:deep(.v-field__input) {
    color: #fff !important;
}

.signup-footer {
    font-size: 13px;
    color: #475569;
    margin-top: 32px;
}

.wizard-link {
    color: #3D95CE;
    text-decoration: none;
}

.wizard-link:hover {
    text-decoration: underline;
}
</style>
