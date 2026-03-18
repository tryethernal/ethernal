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
            <div class="wizard-form-inner">
                <!-- Logo -->
                <div class="wizard-logo">
                    <div class="wizard-logo-icon">E</div>
                    <span>Ethernal</span>
                </div>

                <!-- Progress bar -->
                <div class="wizard-progress">
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

                <!-- Step content -->
                <div class="wizard-step-content">
                    <v-slide-x-transition mode="out-in">
                        <!-- Step 0: Path Selection -->
                        <OnboardingPathSelector
                            v-if="currentStep === 0"
                            :default-path="selectedPath"
                            @path-selected="onPathSelected"
                        />

                        <!-- Step 1: Setup -->
                        <OnboardingExplorerSetup
                            v-else-if="currentStep === 1 && selectedPath === 'public'"
                            :initial-rpc="setupData.rpcServer || ''"
                            :initial-name="setupData.name || ''"
                            @explorer-info-ready="onExplorerInfoReady"
                            @back="currentStep = 0"
                        />
                        <CreateWorkspace
                            v-else-if="currentStep === 1 && selectedPath === 'private'"
                            :is-onboarding="true"
                            @workspace-created="onPrivateWorkspaceSetup"
                            @back="currentStep = 0"
                        />

                        <!-- Step 2: Signup -->
                        <OnboardingSignup
                            v-else-if="currentStep === 2"
                            :path="selectedPath"
                            :setup-data="setupData"
                            @signup-complete="onSignupComplete"
                            @back="currentStep = 1"
                        />

                        <!-- Step 3: Result -->
                        <OnboardingExplorerLive
                            v-else-if="currentStep === 3 && selectedPath === 'public'"
                            :explorer="createdExplorer"
                            :default-plan="context.plan || 'free'"
                            @plan-selected="onPlanSelected"
                            @skipped="goToDashboard"
                        />
                        <div v-else-if="currentStep === 3 && selectedPath === 'private'" class="text-center">
                            <v-icon size="64" color="success" class="mb-4">mdi-check-circle</v-icon>
                            <h2 class="text-h5 font-weight-bold mb-2">You're all set!</h2>
                            <p class="wizard-subtitle mb-8">Your workspace is ready. Redirecting to the dashboard...</p>
                            <v-progress-circular indeterminate color="primary" />
                        </div>
                    </v-slide-x-transition>
                </div>

                <!-- Footer -->
                <div class="wizard-footer">
                    Already have an account? <router-link to="/auth" class="wizard-link">Sign in</router-link>
                </div>
            </div>
        </div>

        <!-- Right: Context Panel (hidden on mobile) -->
        <div class="wizard-context-panel">
            <div class="wizard-context-inner">
                <v-fade-transition mode="out-in">
                    <!-- Step 0 context -->
                    <div v-if="currentStep === 0" key="ctx-0" class="wizard-context-content">
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
                    </div>
                </v-fade-transition>
            </div>
        </div>
    </div>
</template>

<script setup>
/**
 * @fileoverview OnboardingWizard orchestrates the full onboarding flow.
 * Split-screen layout: form on left, contextual content on right.
 */
import { ref, onMounted, inject } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { useCurrentWorkspaceStore } from '@/stores/currentWorkspace';
import OnboardingPathSelector from './OnboardingPathSelector.vue';
import OnboardingExplorerSetup from './OnboardingExplorerSetup.vue';
import OnboardingSignup from './OnboardingSignup.vue';
import OnboardingExplorerLive from './OnboardingExplorerLive.vue';
import CreateWorkspace from './CreateWorkspace.vue';

const router = useRouter();
const userStore = useUserStore();
const currentWorkspaceStore = useCurrentWorkspaceStore();
const $server = inject('$server');
const $pusher = inject('$pusher');

const currentStep = ref(0);
const selectedPath = ref('private');
const setupData = ref({});
const createdExplorer = ref(null);
const context = ref({});
const stepLabels = ['Path', 'Setup', 'Account', 'Done'];

onMounted(() => {
    try {
        const stored = sessionStorage.getItem('onboardingContext');
        if (stored) {
            context.value = JSON.parse(stored);
            if (context.value.flow === 'public' || context.value.source === 'landing_cta') {
                selectedPath.value = 'public';
            }
        }
    } catch {
        // Ignore parse errors
    }

    if (window.posthog) {
        window.posthog.capture('onboarding:flow_started', {
            source: context.value.source || 'direct',
            default_path: selectedPath.value,
            has_context: !!context.value.source
        });
    }
});

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

function onPrivateWorkspaceSetup(data) {
    if (userStore.loggedIn && data) {
        currentWorkspaceStore.updateCurrentWorkspace(data);
        $pusher.init();
        goToDashboard();
        return;
    }
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
    if (data.authToken) {
        localStorage.setItem('apiToken', data.authToken);
    }
    userStore.updateUser({
        ...data.user,
        apiToken: data.authToken || data.user.apiToken
    });
    if (data.workspace) {
        currentWorkspaceStore.updateCurrentWorkspace(data.workspace);
    }
    $pusher.init();
    if (data.explorer) {
        createdExplorer.value = data.explorer;
    }
    currentStep.value = 3;
    if (selectedPath.value === 'private') {
        setTimeout(() => goToDashboard(), 1500);
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
    goToDashboard();
}

function goToDashboard() {
    sessionStorage.removeItem('onboardingContext');
    router.push('/overview');
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
    padding: 48px;
    min-width: 0;
}

.wizard-form-inner {
    max-width: 440px;
    margin: 0 auto;
    width: 100%;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    padding: 32px 0;
}

.wizard-logo {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 18px;
    font-weight: 700;
    color: #fff;
    margin-bottom: 32px;
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
    margin-bottom: 32px;
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
    width: 45%;
    background: linear-gradient(160deg, #1a2744 0%, #0d1829 50%, #162036 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px;
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
    display: flex;
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
