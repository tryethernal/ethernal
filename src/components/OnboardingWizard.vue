<!--
    @fileoverview OnboardingWizard component — full-page wizard orchestrating the onboarding flow.
    Replaces the old OnboardingModal with a route-based multi-step wizard at /onboarding.
    Reads URL context from sessionStorage (set by Auth.vue) and guides users through:
    Step 1: Path Selection (public explorer vs private workspace)
    Step 2: Setup (explorer RPC config or workspace creation)
    Step 3: Signup (email + password, calls atomic onboarding endpoint)
    Step 4: Result (live explorer with plan selection, or dashboard redirect)
    @component OnboardingWizard
-->
<template>
    <div class="onboarding-wizard">
        <!-- Header -->
        <div class="wizard-header">
            <div class="d-flex align-center justify-space-between px-4 px-sm-8" style="max-width: 1200px; margin: 0 auto; width: 100%;">
                <div class="text-h6 font-weight-bold">Ethernal</div>
                <div class="step-indicator d-flex align-center ga-2">
                    <template v-for="(label, idx) in stepLabels" :key="idx">
                        <div
                            :class="[
                                'step-dot',
                                { 'step-dot--active': idx === currentStep },
                                { 'step-dot--done': idx < currentStep }
                            ]"
                        >
                            <v-icon v-if="idx < currentStep" size="14" color="white">mdi-check</v-icon>
                            <span v-else class="step-number">{{ idx + 1 }}</span>
                        </div>
                        <span
                            v-if="idx < stepLabels.length - 1"
                            class="step-label d-none d-sm-inline text-body-2"
                            :class="{ 'text-medium-emphasis': idx >= currentStep }"
                        >
                            {{ label }}
                        </span>
                        <div v-if="idx < stepLabels.length - 1" class="step-connector"></div>
                    </template>
                    <!-- Last label (no connector after it) -->
                    <span
                        class="step-label d-none d-sm-inline text-body-2"
                        :class="{ 'text-medium-emphasis': stepLabels.length - 1 > currentStep }"
                    >
                        {{ stepLabels[stepLabels.length - 1] }}
                    </span>
                </div>
            </div>
        </div>

        <!-- Content -->
        <div class="wizard-content">
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
                    <p class="text-body-2 text-medium-emphasis mb-8">Your workspace is ready. Redirecting to the dashboard...</p>
                    <v-progress-circular indeterminate color="primary" />
                </div>
            </v-slide-x-transition>
        </div>
    </div>
</template>

<script setup>
/**
 * @fileoverview OnboardingWizard orchestrates the full onboarding flow.
 * Reads context from sessionStorage, manages step transitions, handles
 * signup/auth token storage, and navigates to the dashboard on completion.
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

/** Current step index (0-3). */
const currentStep = ref(0);

/** Selected onboarding path: 'public' or 'private'. */
const selectedPath = ref('private');

/** Data collected during setup step. */
const setupData = ref({});

/** Explorer object returned after signup (public path). */
const createdExplorer = ref(null);

/** Onboarding context read from sessionStorage (set by Auth.vue from URL params). */
const context = ref({});

/** Step labels for the header indicator. */
const stepLabels = ['Path', 'Setup', 'Account', 'Done'];

onMounted(() => {
    // Read onboarding context from sessionStorage (set by Auth.vue)
    try {
        const stored = sessionStorage.getItem('onboardingContext');
        if (stored) {
            context.value = JSON.parse(stored);
            // Pre-select path based on context
            if (context.value.flow === 'public' || context.value.source === 'landing_cta') {
                selectedPath.value = 'public';
            }
        }
    } catch {
        // Ignore parse errors
    }

    // Fire PostHog flow started event
    if (window.posthog) {
        window.posthog.capture('onboarding:flow_started', {
            source: context.value.source || 'direct',
            default_path: selectedPath.value,
            has_context: !!context.value.source
        });
    }
});

/**
 * Handles path selection from step 0.
 * @param {String} path - 'public' or 'private'
 */
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

/**
 * Handles explorer info from the public setup step.
 * @param {Object} data - { name, rpcServer, chainId, networkId }
 */
function onExplorerInfoReady(data) {
    setupData.value = { ...setupData.value, ...data };
    currentStep.value = 2;
}

/**
 * Handles workspace setup from the private path CreateWorkspace component.
 * Since CreateWorkspace doesn't have isOnboarding prop yet (Task 11),
 * it will call the API and emit the created workspace data.
 * We capture the workspace name/chain and move to signup, or if the user
 * is already logged in (workspace was created), go to dashboard.
 * @param {Object} data - Workspace data from CreateWorkspace
 */
function onPrivateWorkspaceSetup(data) {
    // CreateWorkspace currently calls the API itself and creates the workspace.
    // If user is already logged in, workspace is created; go to dashboard.
    if (userStore.loggedIn && data) {
        currentWorkspaceStore.updateCurrentWorkspace(data);
        $pusher.init();
        goToDashboard();
        return;
    }

    // For new users (not yet logged in), store workspace info for signup step.
    // Note: with current CreateWorkspace, this path won't be hit until Task 11
    // adds the isOnboarding prop. For now, the above path handles the common case.
    setupData.value = {
        ...setupData.value,
        workspaceName: data.name,
        chain: data.chain
    };
    currentStep.value = 2;
}

/**
 * Handles successful signup from the OnboardingSignup component.
 * Updates stores, stores auth token, and advances to the result step.
 * @param {Object} data - { user, workspace, explorer?, authToken }
 */
function onSignupComplete(data) {
    // Store the auth token so subsequent API calls are authenticated
    if (data.authToken) {
        localStorage.setItem('apiToken', data.authToken);
    }

    // Update user store (this also stores apiToken via updateUser if present)
    userStore.updateUser({
        ...data.user,
        apiToken: data.authToken || data.user.apiToken
    });

    // Update workspace store
    if (data.workspace) {
        currentWorkspaceStore.updateCurrentWorkspace(data.workspace);
    }

    // Initialize pusher for real-time updates
    $pusher.init();

    // Store created explorer for the result step (public path)
    if (data.explorer) {
        createdExplorer.value = data.explorer;
    }

    currentStep.value = 3;

    // For private path, auto-redirect to dashboard after a short delay
    if (selectedPath.value === 'private') {
        setTimeout(() => goToDashboard(), 1500);
    }
}

/**
 * Handles plan selection from the OnboardingExplorerLive component.
 * Starts a trial for paid plans, then navigates to the dashboard.
 * @param {Object} param0 - { planSlug, isTrial }
 */
async function onPlanSelected({ planSlug, isTrial }) {
    if (isTrial && createdExplorer.value && planSlug !== 'free' && planSlug !== 'enterprise') {
        try {
            await $server.startTrial(createdExplorer.value.id, planSlug);
        } catch (error) {
            console.error('Failed to start trial:', error);
            // Continue to dashboard even if trial activation fails
        }
    }

    goToDashboard();
}

/**
 * Navigates to the main dashboard.
 */
function goToDashboard() {
    // Clean up onboarding context
    sessionStorage.removeItem('onboardingContext');

    router.push('/overview');
}
</script>

<style scoped>
.onboarding-wizard {
    min-height: 100vh;
    background: rgb(var(--v-theme-background));
    display: flex;
    flex-direction: column;
}

.wizard-header {
    padding: 16px 0;
    border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.wizard-content {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px 16px;
}

.step-indicator {
    display: flex;
    align-items: center;
}

.step-dot {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 600;
    background: rgba(var(--v-border-color), 0.3);
    color: rgba(var(--v-theme-on-background), 0.5);
    transition: all 0.3s ease;
    flex-shrink: 0;
}

.step-dot--active {
    background: rgb(var(--v-theme-primary));
    color: white;
}

.step-dot--done {
    background: #4caf50;
    color: white;
}

.step-number {
    line-height: 1;
}

.step-connector {
    width: 24px;
    height: 2px;
    background: rgba(var(--v-border-color), 0.3);
    flex-shrink: 0;
}

.step-label {
    white-space: nowrap;
}
</style>
