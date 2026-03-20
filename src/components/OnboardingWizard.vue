<!--
    @fileoverview OnboardingWizard component — full-page split-screen wizard.
    Left: form panel with step counter and navigation.
    Right: contextual illustration panel that changes per step.
    @component OnboardingWizard
-->
<template>
    <div class="onboarding-wizard">
        <!-- Left: Form Panel -->
        <div class="wizard-form-panel">
            <div class="wizard-form-inner" :style="isWideStep ? { maxWidth: '680px' } : {}">
                <!-- Logo -->
                <div class="wizard-logo">
                    <div class="wizard-logo-icon">E</div>
                    <span>Ethernal</span>
                </div>

                <!-- Progress bar (only in wizard mode) -->
                <div v-if="view === 'wizard'" class="wizard-progress">
                    <div
                        v-for="(_, idx) in stepLabels"
                        :key="idx"
                        :class="[
                            'wizard-progress-segment',
                            { 'wizard-progress-segment--done': idx < currentStep },
                            { 'wizard-progress-segment--active': idx === currentStep }
                        ]"
                    />
                </div>

                <!-- Auth views -->
                <div v-if="view === 'signin'" class="wizard-step-content">
                    <!-- Sign In -->
                    <div v-if="authMode === 'signin'" class="auth-view">
                        <h2 class="step-title">Welcome back</h2>
                        <p class="step-subtitle">Sign in to your account to continue.</p>

                        <v-slide-y-transition>
                            <div v-if="authError" class="error-msg">
                                <v-icon size="16" color="#EF4444">mdi-alert-circle</v-icon>
                                <span>{{ authError }}</span>
                            </div>
                        </v-slide-y-transition>

                        <v-form @submit.prevent="authSignIn" v-model="authValid">
                            <div class="field-group">
                                <label class="field-label">Email</label>
                                <v-text-field
                                    v-model="authEmail"
                                    type="email"
                                    placeholder="you@company.com"
                                    variant="outlined"
                                    rounded="lg"
                                    density="comfortable"
                                    :rules="[v => !!v || 'Email is required', v => /.+@.+\..+/.test(v) || 'Invalid email']"
                                    :disabled="authLoading"
                                    autocomplete="email"
                                    bg-color="rgba(255,255,255,0.03)"
                                    hide-details="auto"
                                />
                            </div>

                            <div class="field-group">
                                <label class="field-label">Password</label>
                                <v-text-field
                                    v-model="authPassword"
                                    type="password"
                                    placeholder="Your password"
                                    variant="outlined"
                                    rounded="lg"
                                    density="comfortable"
                                    :rules="[v => !!v || 'Password is required']"
                                    :disabled="authLoading"
                                    autocomplete="current-password"
                                    bg-color="rgba(255,255,255,0.03)"
                                    hide-details="auto"
                                />
                            </div>

                            <div class="auth-actions">
                                <a href="#" class="forgot-link" @click.prevent="switchAuthMode('forgottenPwd')">Forgot password?</a>
                                <v-btn
                                    color="#3D95CE"
                                    size="large"
                                    rounded="lg"
                                    type="submit"
                                    :loading="authLoading"
                                    :disabled="!authValid"
                                    class="continue-btn"
                                >
                                    Sign In
                                    <v-icon end>mdi-arrow-right</v-icon>
                                </v-btn>
                            </div>
                        </v-form>

                        <div class="auth-footer">
                            Don't have an account? <a href="#" class="wizard-link" @click.prevent="switchToWizard">Get Started</a>
                        </div>
                    </div>

                    <!-- Forgotten Password -->
                    <div v-else-if="authMode === 'forgottenPwd'" class="auth-view">
                        <h2 class="step-title">Forgot your password?</h2>
                        <p class="step-subtitle">Enter your email and we'll send you a reset link.</p>

                        <v-slide-y-transition>
                            <div v-if="authError" class="error-msg">
                                <v-icon size="16" color="#EF4444">mdi-alert-circle</v-icon>
                                <span>{{ authError }}</span>
                            </div>
                        </v-slide-y-transition>
                        <v-slide-y-transition>
                            <div v-if="authSuccess" class="success-msg">
                                <v-icon size="16" color="#22C55E">mdi-check-circle</v-icon>
                                <span>{{ authSuccess }}</span>
                            </div>
                        </v-slide-y-transition>

                        <v-form @submit.prevent="authSendResetEmail" v-model="authValid">
                            <div class="field-group">
                                <label class="field-label">Email</label>
                                <v-text-field
                                    v-model="authEmail"
                                    type="email"
                                    placeholder="you@company.com"
                                    variant="outlined"
                                    rounded="lg"
                                    density="comfortable"
                                    :rules="[v => !!v || 'Email is required', v => /.+@.+\..+/.test(v) || 'Invalid email']"
                                    :disabled="authLoading"
                                    autocomplete="email"
                                    bg-color="rgba(255,255,255,0.03)"
                                    hide-details="auto"
                                />
                            </div>

                            <div class="auth-actions">
                                <a href="#" class="forgot-link" @click.prevent="switchAuthMode('signin')">Back to sign in</a>
                                <v-btn
                                    color="#3D95CE"
                                    size="large"
                                    rounded="lg"
                                    type="submit"
                                    :loading="authLoading"
                                    :disabled="!authValid"
                                    class="continue-btn"
                                >
                                    Send Reset Link
                                    <v-icon end>mdi-arrow-right</v-icon>
                                </v-btn>
                            </div>
                        </v-form>

                        <div class="auth-footer">
                            Don't have an account? <a href="#" class="wizard-link" @click.prevent="switchToWizard">Get Started</a>
                        </div>
                    </div>

                    <!-- Reset Password -->
                    <div v-else-if="authMode === 'resetPwd'" class="auth-view">
                        <h2 class="step-title">Reset your password</h2>
                        <p class="step-subtitle">Choose a new password for your account.</p>

                        <v-slide-y-transition>
                            <div v-if="authError" class="error-msg">
                                <v-icon size="16" color="#EF4444">mdi-alert-circle</v-icon>
                                <span>{{ authError }}</span>
                            </div>
                        </v-slide-y-transition>
                        <v-slide-y-transition>
                            <div v-if="authSuccess" class="success-msg">
                                <v-icon size="16" color="#22C55E">mdi-check-circle</v-icon>
                                <span>{{ authSuccess }}</span>
                            </div>
                        </v-slide-y-transition>

                        <v-form @submit.prevent="authResetPassword" v-model="authValid">
                            <div class="field-group">
                                <label class="field-label">New Password</label>
                                <v-text-field
                                    v-model="authPassword"
                                    type="password"
                                    placeholder="At least 6 characters"
                                    variant="outlined"
                                    rounded="lg"
                                    density="comfortable"
                                    :rules="[v => !!v || 'Password is required', v => v.length >= 6 || 'At least 6 characters']"
                                    :disabled="authLoading"
                                    bg-color="rgba(255,255,255,0.03)"
                                    hide-details="auto"
                                />
                            </div>

                            <div class="auth-actions">
                                <a href="#" class="forgot-link" @click.prevent="switchAuthMode('signin')">Back to sign in</a>
                                <v-btn
                                    color="#3D95CE"
                                    size="large"
                                    rounded="lg"
                                    type="submit"
                                    :loading="authLoading"
                                    :disabled="!authValid"
                                    class="continue-btn"
                                >
                                    Reset Password
                                    <v-icon end>mdi-arrow-right</v-icon>
                                </v-btn>
                            </div>
                        </v-form>
                    </div>
                </div>

                <!-- Wizard steps -->
                <div v-else :class="['wizard-step-content', { 'wizard-step-content--top': currentStep === 3 }]">
                    <v-slide-x-transition mode="out-in">
                        <OnboardingPathSelector
                            v-if="currentStep === 0"
                            :default-path="selectedPath"
                            @path-selected="onPathSelected"
                            @signin="switchToSignin"
                        />
                        <OnboardingExplorerSetup
                            v-else-if="currentStep === 1 && selectedPath === 'public'"
                            :initial-rpc="setupData.rpcServer || ''"
                            :initial-name="setupData.name || ''"
                            @explorer-info-ready="onExplorerInfoReady"
                            @back="currentStep = 0"
                            @signin="switchToSignin"
                        />
                        <OnboardingWorkspaceSetup
                            v-else-if="currentStep === 1 && selectedPath === 'private'"
                            :initial-name="setupData.workspaceName || ''"
                            :initial-rpc="setupData.rpcServer || ''"
                            @workspace-info-ready="onWorkspaceInfoReady"
                            @back="currentStep = 0"
                            @signin="switchToSignin"
                        />
                        <OnboardingSignup
                            v-else-if="currentStep === 2"
                            :path="selectedPath"
                            :setup-data="setupData"
                            @signup-complete="onSignupComplete"
                            @signin-complete="onSigninComplete"
                            @back="currentStep = 1"
                        />
                        <OnboardingExplorerLive
                            v-else-if="currentStep === 3 && selectedPath === 'public'"
                            :explorer="createdExplorer"
                            :default-plan="context.plan || 'explorer-150'"
                            @plan-selected="onPlanSelected"
                        />
                        <div v-else-if="currentStep === 3 && selectedPath === 'private'" class="private-success">
                            <div class="private-success-icon">
                                <v-icon size="28" color="#3D95CE">mdi-check</v-icon>
                            </div>
                            <h2 class="step-title" style="text-align: center;">You're all set!</h2>
                            <p class="step-subtitle" style="text-align: center;">Your workspace is ready. Head to the dashboard to start exploring.</p>
                            <v-btn
                                color="#3D95CE"
                                size="large"
                                rounded="lg"
                                block
                                class="continue-btn"
                                @click="goToDashboard"
                            >
                                Go to Dashboard
                                <v-icon end>mdi-arrow-right</v-icon>
                            </v-btn>
                        </div>
                    </v-slide-x-transition>
                </div>

            </div>
        </div>

        <!-- Right: Context Panel (hidden on mobile) -->
        <div class="wizard-context-panel">
            <div class="wizard-context-inner">
                <v-fade-transition mode="out-in">
                    <!-- Auth context -->
                    <div v-if="view === 'signin'" key="ctx-auth" class="wizard-context-content">
                        <div class="wizard-context-icon-row">
                            <div class="wizard-context-icon wizard-context-icon--primary">
                                <v-icon size="28" color="white">mdi-view-dashboard-outline</v-icon>
                            </div>
                        </div>
                        <h3 class="wizard-context-title">Welcome back to Ethernal</h3>
                        <p class="wizard-context-desc">Pick up where you left off. Your explorers, workspaces, and settings are waiting for you.</p>
                        <div class="wizard-context-features">
                            <div class="wizard-context-feature">
                                <v-icon size="16" color="#3D95CE">mdi-check-circle</v-icon>
                                <span>Manage your explorers and workspaces</span>
                            </div>
                            <div class="wizard-context-feature">
                                <v-icon size="16" color="#3D95CE">mdi-check-circle</v-icon>
                                <span>Monitor chain sync and analytics</span>
                            </div>
                            <div class="wizard-context-feature">
                                <v-icon size="16" color="#3D95CE">mdi-check-circle</v-icon>
                                <span>Update branding, domains, and billing</span>
                            </div>
                        </div>
                    </div>

                    <!-- Step 0 context -->
                    <div v-else-if="currentStep === 0 && view === 'wizard'" key="ctx-0" class="wizard-context-content">
                        <div class="wizard-context-icon-row">
                            <div class="wizard-context-icon wizard-context-icon--primary">
                                <v-icon size="28" color="white">mdi-cube-scan</v-icon>
                            </div>
                        </div>
                        <h3 class="wizard-context-title">Your block explorer, ready in minutes</h3>
                        <p class="wizard-context-desc">Deploy a fully-featured explorer for any EVM chain. Contract verification, token tracking, and real-time sync out of the box.</p>
                        <div class="wizard-context-features">
                            <div class="wizard-context-feature">
                                <v-icon size="16" color="#3D95CE">mdi-check-circle</v-icon>
                                <span>Works with any EVM-compatible chain</span>
                            </div>
                            <div class="wizard-context-feature">
                                <v-icon size="16" color="#3D95CE">mdi-check-circle</v-icon>
                                <span>Custom domain and branding</span>
                            </div>
                            <div class="wizard-context-feature">
                                <v-icon size="16" color="#3D95CE">mdi-check-circle</v-icon>
                                <span>Free tier available, no credit card needed</span>
                            </div>
                        </div>
                    </div>

                    <!-- Step 1 context -->
                    <div v-else-if="currentStep === 1" key="ctx-1" class="wizard-context-content">
                        <div class="wizard-context-icon-row">
                            <div class="wizard-context-icon wizard-context-icon--primary">
                                <v-icon size="28" color="white">mdi-link-variant</v-icon>
                            </div>
                            <div class="wizard-context-arrows">
                                <v-icon size="16" color="#334155">mdi-arrow-right</v-icon>
                                <v-icon size="16" color="#334155">mdi-arrow-right</v-icon>
                            </div>
                            <div class="wizard-context-icon wizard-context-icon--success">
                                <v-icon size="28" color="white">mdi-database-check</v-icon>
                            </div>
                        </div>
                        <h3 class="wizard-context-title">{{ selectedPath === 'public' ? 'Connect any EVM chain' : 'Connect your local node' }}</h3>
                        <p class="wizard-context-desc">{{ selectedPath === 'public'
                            ? 'Your explorer will start syncing blocks, transactions, and contracts from your chain in real-time.'
                            : 'Connect to Hardhat, Anvil, or any local node. Transaction decoding and tracing work out of the box.' }}</p>
                        <div class="wizard-context-features">
                            <div class="wizard-context-feature">
                                <v-icon size="16" color="#3D95CE">mdi-check-circle</v-icon>
                                <span>Automatic chain detection</span>
                            </div>
                            <div class="wizard-context-feature">
                                <v-icon size="16" color="#3D95CE">mdi-check-circle</v-icon>
                                <span>Contract verification</span>
                            </div>
                            <div class="wizard-context-feature">
                                <v-icon size="16" color="#3D95CE">mdi-check-circle</v-icon>
                                <span>Token and NFT tracking</span>
                            </div>
                        </div>
                    </div>

                    <!-- Step 2 context -->
                    <div v-else-if="currentStep === 2" key="ctx-2" class="wizard-context-content">
                        <div class="wizard-context-icon-row">
                            <div class="wizard-context-icon wizard-context-icon--primary">
                                <v-icon size="28" color="white">mdi-shield-check</v-icon>
                            </div>
                        </div>
                        <h3 class="wizard-context-title">Almost there</h3>
                        <p class="wizard-context-desc">Create your account to launch your {{ selectedPath === 'public' ? 'explorer' : 'workspace' }}. You'll be up and running in seconds.</p>
                        <div class="wizard-context-features">
                            <div class="wizard-context-feature">
                                <v-icon size="16" color="#3D95CE">mdi-check-circle</v-icon>
                                <span>No credit card required</span>
                            </div>
                            <div class="wizard-context-feature">
                                <v-icon size="16" color="#3D95CE">mdi-check-circle</v-icon>
                                <span>7-day free trial on paid plans</span>
                            </div>
                            <div class="wizard-context-feature">
                                <v-icon size="16" color="#3D95CE">mdi-check-circle</v-icon>
                                <span>Cancel anytime</span>
                            </div>
                        </div>
                    </div>

                    <!-- Step 3 context -->
                    <div v-else-if="currentStep === 3" key="ctx-3" class="wizard-context-content">
                        <div class="wizard-context-icon-row">
                            <div class="wizard-context-icon wizard-context-icon--success" style="width: 64px; height: 64px; border-radius: 16px;">
                                <v-icon size="32" color="white">mdi-rocket-launch</v-icon>
                            </div>
                        </div>
                        <h3 class="wizard-context-title">You're live!</h3>
                        <p class="wizard-context-desc">Your explorer is syncing data from your chain. Choose a plan to unlock more features, or start with the free tier.</p>
                        <div v-if="liveBlockNumber != null" class="wizard-context-block">
                            <v-icon size="14" color="#22C55E" class="mr-1">mdi-cube-outline</v-icon>
                            Block #{{ liveBlockNumber.toLocaleString() }}
                        </div>
                    </div>
                </v-fade-transition>
            </div>
        </div>
        <!-- Success modal with confetti -->
        <v-dialog v-model="showSuccessModal" persistent max-width="480" scrim="black" class="onboarding-success-overlay">
            <div class="success-modal">
                <!-- Confetti canvas -->
                <canvas ref="confettiCanvas" class="confetti-canvas" />

                <div class="success-modal-content">
                    <div class="success-modal-icon">
                        <v-icon size="48" color="#22C55E">mdi-check-circle</v-icon>
                    </div>
                    <h2 class="success-modal-title">You're all set!</h2>
                    <p class="success-modal-desc">Your explorer is live and syncing data from your chain.</p>

                    <a :href="explorerUrl" target="_blank" class="success-modal-explorer-link">
                        <v-icon size="16" color="#3D95CE">mdi-open-in-new</v-icon>
                        {{ explorerUrl }}
                    </a>

                    <v-btn
                        color="#3D95CE"
                        size="large"
                        rounded="lg"
                        block
                        class="success-modal-cta"
                        @click="goToDashboard"
                    >
                        Go to Dashboard
                        <v-icon end>mdi-arrow-right</v-icon>
                    </v-btn>
                </div>
            </div>
        </v-dialog>
    </div>
</template>

<script setup>
/**
 * @fileoverview OnboardingWizard orchestrates the full onboarding flow.
 * Split-screen layout: form on left, contextual content on right.
 */
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount, inject } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { useCurrentWorkspaceStore } from '@/stores/currentWorkspace';
import OnboardingPathSelector from './OnboardingPathSelector.vue';
import OnboardingExplorerSetup from './OnboardingExplorerSetup.vue';
import OnboardingSignup from './OnboardingSignup.vue';
import OnboardingExplorerLive from './OnboardingExplorerLive.vue';
import OnboardingWorkspaceSetup from './OnboardingWorkspaceSetup.vue';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const currentWorkspaceStore = useCurrentWorkspaceStore();
const $server = inject('$server');
const $pusher = inject('$pusher');

const currentStep = ref(0);
const selectedPath = ref('public');
const setupData = ref({});
const createdExplorer = ref(null);
const context = ref({});
const stepLabels = ['Path', 'Setup', 'Account', 'Done'];
const isWideStep = computed(() => currentStep.value === 3 && selectedPath.value === 'public');
const liveBlockNumber = ref(null);
const showSuccessModal = ref(false);
const confettiCanvas = ref(null);
let blockPollInterval = null;

const view = ref('signin');
const authMode = ref('signin');
const authEmail = ref('');
const authPassword = ref('');
const authValid = ref(false);
const authLoading = ref(false);
const authError = ref('');
const authSuccess = ref('');
const resetPasswordToken = ref(null);

const explorerUrl = computed(() => {
    if (!createdExplorer.value) return '';
    const slug = createdExplorer.value.slug || createdExplorer.value.name?.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `https://${slug}.tryethernal.com`;
});

onMounted(() => {
    if (route.query.apiToken && route.query.path) {
        userStore.updateUser({ apiToken: route.query.apiToken });
        window.location.assign(`//${window.location.host}${route.query.path}${route.query.explorerToken ? '?explorerToken=' + route.query.explorerToken : ''}`);
        return;
    }

    if (route.query.token) {
        authMode.value = 'resetPwd';
        resetPasswordToken.value = route.query.token;
        view.value = 'signin';
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const ctx = {};
    ['flow', 'chain', 'plan', 'explorerToken', 'rpc', 'source', 'name'].forEach(key => {
        if (params.get(key)) ctx[key] = params.get(key);
    });

    if (ctx.explorerToken) {
        view.value = 'signin';
        return;
    }

    if (Object.keys(ctx).length) {
        sessionStorage.setItem('onboardingContext', JSON.stringify(ctx));
    }

    try {
        const stored = sessionStorage.getItem('onboardingContext');
        if (stored) {
            context.value = JSON.parse(stored);
            if (context.value.flow === 'private') {
                selectedPath.value = 'private';
            } else if (context.value.flow === 'public' || context.value.source === 'landing_cta') {
                selectedPath.value = 'public';
            }
        }
    } catch {
        // Ignore parse errors
    }

    if (userStore.loggedIn) {
        if (context.value.name) setupData.value.name = context.value.name;
        if (context.value.rpc) setupData.value.rpcServer = context.value.rpc;
        if (route.query.name) setupData.value.name = route.query.name;
        if (route.query.rpc) setupData.value.rpcServer = route.query.rpc;

        const flow = context.value.flow || route.query.flow || selectedPath.value;
        selectedPath.value = flow === 'public' ? 'public' : 'private';

        // Logged in but no workspace — enter wizard so they can set one up
        if (!currentWorkspaceStore.id) {
            view.value = 'wizard';
            return;
        }

        redirectSignedInUser();
        return;
    }

    if (ctx.flow) {
        view.value = 'wizard';
        if (window.posthog) {
            window.posthog.capture('onboarding:flow_started', {
                source: context.value.source || 'direct',
                default_path: selectedPath.value,
                has_context: !!context.value.source
            });
        }
        return;
    }

    view.value = 'signin';
});

function switchAuthMode(mode) {
    authError.value = '';
    authSuccess.value = '';
    authEmail.value = '';
    authPassword.value = '';
    authMode.value = mode;
}

function switchToWizard() {
    view.value = 'wizard';
}

function switchToSignin() {
    view.value = 'signin';
    authMode.value = 'signin';
    authError.value = '';
    authSuccess.value = '';
}

async function authSignIn() {
    authLoading.value = true;
    authError.value = '';
    try {
        const { data: { user, token } } = await $server.signIn(authEmail.value, authPassword.value);
        localStorage.setItem('apiToken', token);
        userStore.updateUser({ ...user, apiToken: token });
        window.location.assign(`/overview${route.query.explorerToken ? '?explorerToken=' + route.query.explorerToken : ''}`);
    } catch (error) {
        authError.value = error.response?.data || 'Error while signing in. Please retry.';
        authLoading.value = false;
    }
}

async function authSendResetEmail() {
    authLoading.value = true;
    authError.value = '';
    authSuccess.value = '';
    try {
        await $server.sendResetPasswordEmail(authEmail.value);
        authSuccess.value = 'An email has been sent with a link to reset your password.';
    } catch (error) {
        authError.value = error.response?.data || 'Could not send reset email.';
    } finally {
        authLoading.value = false;
    }
}

async function authResetPassword() {
    authLoading.value = true;
    authError.value = '';
    authSuccess.value = '';
    try {
        await $server.resetPassword(resetPasswordToken.value, authPassword.value);
        authSuccess.value = 'Your password has been reset successfully. You can now sign in.';
    } catch (error) {
        authError.value = error.response?.data || 'Could not reset password.';
    } finally {
        authLoading.value = false;
    }
}

function onPathSelected(path) {
    selectedPath.value = path;
    if (window.posthog) {
        window.posthog.capture('onboarding:path_selected', {
            path,
            source: context.value.source || 'direct'
        });
    }
    currentStep.value = 1;
}

function onExplorerInfoReady(data) {
    setupData.value = { ...setupData.value, ...data };
    currentStep.value = 2;
}

function onWorkspaceInfoReady(data) {
    setupData.value = {
        ...setupData.value,
        workspaceName: data.name,
        rpcServer: data.rpcServer,
        chain: data.chain,
        networkId: data.networkId
    };
    currentStep.value = 2;
}

function onSignupComplete(data) {
    if (data.token) {
        localStorage.setItem('apiToken', data.token);
    }
    userStore.updateUser({
        ...data.user,
        apiToken: data.token || data.user.apiToken
    });
    if (data.workspace) {
        currentWorkspaceStore.updateCurrentWorkspace(data.workspace);
    }
    $pusher.init();
    if (data.explorer) {
        createdExplorer.value = data.explorer;
    }
    currentStep.value = 3;
}

/**
 * Handles sign-in completion for already-existing users on the signup step.
 * Updates the store, sets the API token, and redirects to the appropriate in-app modal.
 * @param {{ user: Object }} payload - The signed-in user object
 */
function onSigninComplete({ user }) {
    userStore.updateUser(user);
    localStorage.setItem('apiToken', user.apiToken);
    $pusher.init();
    redirectSignedInUser();
}

/**
 * Redirects a signed-in user to the appropriate in-app creation modal,
 * prefilling setup data via query params.
 */
function redirectSignedInUser() {
    sessionStorage.removeItem('onboardingContext');
    if (selectedPath.value === 'public') {
        router.push({
            path: '/explorers',
            query: {
                openCreate: 'true',
                name: setupData.value.name || '',
                rpc: setupData.value.rpcServer || ''
            }
        });
    } else {
        router.push({
            path: '/settings',
            query: {
                openWorkspace: 'true',
                name: setupData.value.workspaceName || '',
                rpc: setupData.value.rpcServer || ''
            }
        });
    }
}

async function onPlanSelected({ planSlug, isTrial }) {
    if (isTrial && createdExplorer.value && planSlug !== 'free' && planSlug !== 'enterprise') {
        try {
            await $server.startTrial(createdExplorer.value.id, planSlug);
        } catch (error) {
            console.error('Failed to start trial:', error);
        }
    }
    showSuccessModal.value = true;
    await nextTick();
    launchConfetti();
}

function launchConfetti() {
    const canvas = confettiCanvas.value;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const colors = ['#3D95CE', '#22C55E', '#5DAAE0', '#F59E0B', '#EC4899', '#8B5CF6'];
    const particles = Array.from({ length: 120 }, () => ({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 1) * 10 - 2,
        w: Math.random() * 8 + 4,
        h: Math.random() * 4 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        gravity: 0.12,
        opacity: 1
    }));

    let frame = 0;
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let alive = false;
        for (const p of particles) {
            p.x += p.vx;
            p.vy += p.gravity;
            p.y += p.vy;
            p.rotation += p.rotationSpeed;
            if (frame > 60) p.opacity -= 0.015;
            if (p.opacity <= 0) continue;
            alive = true;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.globalAlpha = Math.max(0, p.opacity);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            ctx.restore();
        }
        frame++;
        if (alive) requestAnimationFrame(animate);
    }
    animate();
}

async function pollBlockNumber() {
    try {
        const { data } = await $server.getBlocks({ page: 1, itemsPerPage: 1, order: 'DESC' });
        const blocks = data.items || data;
        if (blocks.length > 0 && blocks[0].number != null) {
            liveBlockNumber.value = blocks[0].number;
        }
    } catch {
        // Explorer may not be syncing yet
    }
}

watch(currentStep, (step) => {
    if (step === 3 && selectedPath.value === 'public') {
        pollBlockNumber();
        blockPollInterval = setInterval(pollBlockNumber, 5000);
    }
});

onBeforeUnmount(() => {
    if (blockPollInterval) clearInterval(blockPollInterval);
});

function goToDashboard() {
    sessionStorage.removeItem('onboardingContext');
    window.location.assign(createdExplorer.value?.id ? `/explorers/${createdExplorer.value.id}` : '/overview');
}
</script>

<style scoped>
.onboarding-wizard {
    min-height: 100vh;
    display: flex;
    background: #0a0f1a;
}

/* Left panel: form */
.wizard-form-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 32px 48px;
    min-width: 0;
}

.wizard-form-inner {
    max-width: 440px;
    margin: 0 auto;
    width: 100%;
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 24px 0;
}

.wizard-logo {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 18px;
    font-weight: 700;
    color: #fff;
    margin-bottom: 20px;
}

.wizard-logo-icon {
    width: 28px;
    height: 28px;
    background: #3D95CE;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 800;
    color: #fff;
}

/* Progress bar */
.wizard-progress {
    display: flex;
    gap: 6px;
    margin-bottom: 20px;
}

.wizard-progress-segment {
    flex: 1;
    height: 4px;
    border-radius: 2px;
    background: #1e293b;
    transition: background 0.3s ease;
}

.wizard-progress-segment--done {
    background: #22C55E;
}

.wizard-progress-segment--active {
    background: #3D95CE;
}

/* Step content */
.wizard-step-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.wizard-step-content--top {
    justify-content: flex-start;
}

/* Footer */
.wizard-footer {
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

.wizard-subtitle {
    font-size: 14px;
    color: #64748b;
}

/* Right panel: contextual illustration */
.wizard-context-panel {
    width: 40%;
    background: linear-gradient(160deg, #1a2744 0%, #0d1829 50%, #162036 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px 48px;
    border-left: 1px solid #1e293b;
}

.wizard-context-inner {
    max-width: 360px;
    width: 100%;
}

.wizard-context-content {
    text-align: center;
}

.wizard-context-icon-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    margin-bottom: 28px;
}

.wizard-context-icon {
    width: 56px;
    height: 56px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.wizard-context-icon--primary {
    background: rgba(61, 149, 206, 0.15);
    border: 2px solid rgba(61, 149, 206, 0.4);
}

.wizard-context-icon--success {
    background: rgba(34, 197, 94, 0.15);
    border: 2px solid rgba(34, 197, 94, 0.4);
}

.wizard-context-arrows {
    display: flex;
    gap: 4px;
}

.wizard-context-title {
    font-size: 22px;
    font-weight: 700;
    color: #fff;
    margin-bottom: 12px;
    line-height: 1.3;
}

.wizard-context-desc {
    font-size: 14px;
    color: #64748b;
    line-height: 1.7;
    margin-bottom: 28px;
}

.wizard-context-features {
    display: inline-flex;
    flex-direction: column;
    gap: 12px;
    text-align: left;
}

.wizard-context-feature {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    color: #94a3b8;
}

.wizard-context-block {
    display: inline-flex;
    align-items: center;
    margin-top: 20px;
    padding: 6px 14px;
    border-radius: 100px;
    background: rgba(34, 197, 94, 0.08);
    border: 1px solid rgba(34, 197, 94, 0.2);
    color: #22C55E;
    font-size: 13px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
}

/* Success modal */
.success-modal {
    position: relative;
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 16px;
    overflow: hidden;
}

.confetti-canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1;
}

.success-modal-content {
    position: relative;
    z-index: 2;
    padding: 40px 32px;
    text-align: center;
}

.success-modal-icon {
    margin-bottom: 16px;
}

.success-modal-title {
    font-size: 24px;
    font-weight: 700;
    color: #fff;
    margin-bottom: 8px;
}

.success-modal-desc {
    font-size: 14px;
    color: #64748b;
    margin-bottom: 24px;
}

.success-modal-explorer-link {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 14px 24px;
    background: rgba(61, 149, 206, 0.12);
    border: 1px solid rgba(61, 149, 206, 0.35);
    border-radius: 12px;
    color: #fff;
    font-size: 15px;
    font-weight: 600;
    text-decoration: none;
    margin-bottom: 24px;
    transition: all 0.2s;
}

.success-modal-explorer-link:hover {
    background: rgba(61, 149, 206, 0.2);
    border-color: rgba(61, 149, 206, 0.5);
}

.success-modal-cta {
    text-transform: none;
    font-weight: 600;
    letter-spacing: 0;
}

/* Auth views */
.auth-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 28px;
}

.forgot-link {
    color: #64748b;
    font-size: 13px;
    text-decoration: none;
    transition: color 0.2s;
}

.forgot-link:hover {
    color: #94a3b8;
}

.auth-footer {
    font-size: 13px;
    color: #475569;
    margin-top: 24px;
    text-align: center;
}

.private-success {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 32px 0;
}

.private-success-icon {
    width: 56px;
    height: 56px;
    border-radius: 12px;
    background: rgba(61, 149, 206, 0.12);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
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

.success-msg {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: rgba(34, 197, 94, 0.08);
    border: 1px solid rgba(34, 197, 94, 0.2);
    border-radius: 8px;
    margin-bottom: 20px;
    color: #22C55E;
    font-size: 13px;
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

.continue-btn {
    text-transform: none;
    font-weight: 600;
    letter-spacing: 0;
}

:deep(.v-field__input) {
    color: #fff !important;
}

:deep(.v-field__input::placeholder) {
    color: #64748b !important;
    opacity: 1 !important;
}

:deep(.v-label) {
    color: #64748b !important;
}

/* Mobile: hide context panel, full-width form */
@media (max-width: 960px) {
    .wizard-context-panel {
        display: none;
    }

    .wizard-form-panel {
        padding: 24px;
    }

    .wizard-form-inner {
        min-height: auto;
        padding: 16px 0;
    }
}
</style>

<style>
.onboarding-success-overlay .v-overlay__scrim {
    backdrop-filter: blur(8px) !important;
    -webkit-backdrop-filter: blur(8px) !important;
    opacity: 0.75 !important;
}
</style>
