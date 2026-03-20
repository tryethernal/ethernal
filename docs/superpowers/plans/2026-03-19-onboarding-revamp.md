# Onboarding Wizard Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the onboarding wizard with sign-in support, private workspace flow, enterprise contact modal, and backend email endpoint.

**Architecture:** Five independent changes to the Vue 3 + Node.js/Express app. Frontend uses Vuetify components with dark theme styling. Backend uses Mailjet for email. All changes build on the existing split-screen wizard layout on branch `feat/onboarding-revamp`.

**Tech Stack:** Vue 3 (Composition API), Vuetify 3, Pinia, Node.js/Express, Mailjet API, ipaddr.js

**Spec:** `docs/superpowers/specs/2026-03-19-onboarding-revamp-design.md`

---

### Task 1: Fix Plan Selection Button Sizing

**Files:**
- Modify: `src/components/OnboardingExplorerLive.vue:371-376`

- [ ] **Step 1: Add max-height to the CTA button**

In `src/components/OnboardingExplorerLive.vue`, update the `.plan-detail-cta` CSS class:

```css
.plan-detail-cta {
    text-transform: none;
    font-weight: 600;
    letter-spacing: 0;
    margin-top: auto;
    max-height: 48px;
}
```

- [ ] **Step 2: Visually verify the fix**

Run: `docker compose -f docker-compose.dev.yml up app -d` and navigate to the onboarding wizard step 4 to confirm the button no longer takes excessive vertical space.

- [ ] **Step 3: Commit**

```bash
git add src/components/OnboardingExplorerLive.vue
git commit -m "fix(onboarding): constrain plan CTA button height"
```

---

### Task 2: Create OnboardingWorkspaceSetup Component

**Files:**
- Create: `src/components/OnboardingWorkspaceSetup.vue`
- Modify: `src/components/OnboardingWizard.vue:49-54` (replace CreateWorkspace), `:237` (import), `:305-320` (handler)

- [ ] **Step 1: Create OnboardingWorkspaceSetup.vue**

Create `src/components/OnboardingWorkspaceSetup.vue`. This component mirrors the styling of `OnboardingExplorerSetup.vue` but with browser-side RPC validation and CORS tolerance.

```vue
<!--
    @fileoverview Workspace setup step for onboarding wizard (private path).
    Collects workspace name, RPC URL, and chain. Validates RPC from browser.
    @component OnboardingWorkspaceSetup
    @emits workspace-info-ready - Emitted with { name, rpcServer, chain, networkId }
    @emits back - Emitted when user clicks back
-->
<template>
    <div class="workspace-setup">
        <div class="step-label">Step 2 of 4</div>
        <h2 class="step-title">Set up your workspace</h2>
        <p class="step-subtitle">Connect to your local or remote node. We'll detect the network automatically.</p>

        <v-alert type="warning" class="mb-4 safari-warning" v-if="isUsingSafari" density="compact">
            Safari blocks CORS requests to localhost. Use another browser to connect to a local chain.
        </v-alert>

        <div class="detect-row" v-if="!chainInfo">
            <a href="#" class="detect-link" @click.prevent="detectNetwork">Detect Networks</a>
            <v-tooltip location="top">
                <template v-slot:activator="{ props }">
                    <v-icon size="14" color="#64748b" v-bind="props">mdi-help-circle-outline</v-icon>
                </template>
                Sends RPC requests to 127.0.0.1 on http/ws ports 7545, 8545, 9545.
            </v-tooltip>
        </div>
        <ul v-if="detectedNetworks.length" class="detected-list">
            <li v-for="(address, idx) in detectedNetworks" :key="idx">
                {{ address }} <a href="#" class="detect-link" @click.prevent="rpcServer = address">Use</a>
            </li>
        </ul>
        <div v-if="noNetworks" class="no-networks">
            No networks detected. Make sure your node is running on port 7545, 8545, or 9545.
        </div>

        <v-form @submit.prevent="validate" v-model="formValid">
            <div class="field-group">
                <label class="field-label">Workspace Name</label>
                <v-text-field
                    v-model="workspaceName"
                    placeholder="e.g. My Dev Workspace"
                    variant="outlined"
                    rounded="lg"
                    density="comfortable"
                    :rules="[v => !!v || 'Name is required']"
                    :disabled="loading"
                    bg-color="rgba(255,255,255,0.03)"
                    hide-details="auto"
                />
            </div>

            <div class="field-group">
                <label class="field-label">RPC Server URL</label>
                <v-text-field
                    v-model="rpcServer"
                    placeholder="ws://localhost:8545"
                    variant="outlined"
                    rounded="lg"
                    density="comfortable"
                    :rules="[v => !!v || 'RPC URL is required', v => isUrlValid(v) || 'Must be a valid URL']"
                    :disabled="loading"
                    :error-messages="rpcError"
                    bg-color="rgba(255,255,255,0.03)"
                    hide-details="auto"
                />
            </div>

            <div class="field-group">
                <label class="field-label">Chain</label>
                <v-select
                    v-model="chain"
                    :items="availableChains"
                    item-title="name"
                    item-value="slug"
                    variant="outlined"
                    rounded="lg"
                    density="comfortable"
                    bg-color="rgba(255,255,255,0.03)"
                    hide-details="auto"
                />
            </div>

            <v-slide-y-transition>
                <div v-if="chainInfo" class="chain-confirmed">
                    <v-icon size="16" color="#22C55E">mdi-check-circle</v-icon>
                    <span>Connected — Network ID: {{ chainInfo.networkId }}</span>
                </div>
            </v-slide-y-transition>

            <v-slide-y-transition>
                <div v-if="corsWarning" class="cors-warning">
                    <v-icon size="16" color="#F59E0B">mdi-alert</v-icon>
                    <span>We couldn't validate this RPC — this may be due to CORS restrictions. You can continue anyway.</span>
                </div>
            </v-slide-y-transition>

            <div class="step-actions">
                <button type="button" class="back-btn" @click="$emit('back')" :disabled="loading">
                    <v-icon size="16">mdi-arrow-left</v-icon> Back
                </button>
                <div class="action-btns">
                    <v-btn
                        v-if="corsWarning"
                        variant="outlined"
                        color="#64748b"
                        size="large"
                        rounded="lg"
                        class="continue-btn"
                        @click="continueAnyway"
                    >
                        Continue Anyway
                        <v-icon end>mdi-arrow-right</v-icon>
                    </v-btn>
                    <v-btn
                        color="#3D95CE"
                        size="large"
                        rounded="lg"
                        type="submit"
                        :loading="loading"
                        :disabled="!formValid"
                        class="continue-btn"
                    >
                        Continue
                        <v-icon end>mdi-arrow-right</v-icon>
                    </v-btn>
                </div>
            </div>
        </v-form>
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, inject } from 'vue';
import { useEnvStore } from '@/stores/env';
import ipaddr from 'ipaddr.js';

const props = defineProps({
    initialName: { type: String, default: '' },
    initialRpc: { type: String, default: '' }
});

const emit = defineEmits(['workspace-info-ready', 'back']);

const envStore = useEnvStore();
const $server = inject('$server');

const workspaceName = ref(props.initialName);
const rpcServer = ref(props.initialRpc);
const chain = ref('ethereum');
const formValid = ref(false);
const loading = ref(false);
const rpcError = ref('');
const chainInfo = ref(null);
const corsWarning = ref(false);
const localNetwork = ref(false);
const detectedNetworks = ref([]);
const noNetworks = ref(false);
const availableChains = ref([]);

onMounted(() => {
    availableChains.value = Object.values(envStore.chains).map((c) => ({
        name: c.name,
        slug: c.slug
    }));
});

const isUsingSafari = computed(() => !!window.GestureEvent);

function isUrlValid(url) {
    try {
        const parsed = new URL(url);
        return ['http:', 'https:', 'ws:', 'wss:'].includes(parsed.protocol);
    } catch {
        return false;
    }
}

function detectNetwork() {
    noNetworks.value = false;
    $server.searchForLocalChains().then((res) => {
        detectedNetworks.value = res;
        if (!res.length) noNetworks.value = true;
    });
}

async function validate() {
    if (!formValid.value) return;
    loading.value = true;
    rpcError.value = '';
    chainInfo.value = null;
    corsWarning.value = false;

    try {
        const data = await $server.initRpcServer({ rpcServer: rpcServer.value });
        chainInfo.value = data;

        emit('workspace-info-ready', {
            name: workspaceName.value,
            rpcServer: rpcServer.value,
            chain: chain.value,
            networkId: data.networkId || null
        });
    } catch (error) {
        corsWarning.value = true;
        if (localNetwork.value && (rpcServer.value.startsWith('http://') || rpcServer.value.startsWith('ws://'))) {
            rpcError.value = '';
        } else {
            rpcError.value = '';
        }
    } finally {
        loading.value = false;
    }
}

function continueAnyway() {
    emit('workspace-info-ready', {
        name: workspaceName.value,
        rpcServer: rpcServer.value,
        chain: chain.value,
        networkId: null
    });
}

watch(rpcServer, (newVal) => {
    corsWarning.value = false;
    try {
        if (!isUrlValid(newVal)) return;
        const hostname = new URL(newVal).hostname;
        const localStrings = ['private', 'linkLocal', 'loopback', 'carrierGradeNat', 'localhost'];
        if (hostname === 'localhost') {
            localNetwork.value = true;
        } else {
            localNetwork.value = ipaddr.isValid(hostname) && localStrings.indexOf(ipaddr.parse(hostname).range()) > -1;
        }
    } catch {
        // ignore
    }
});
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

.detect-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 16px;
}

.detect-link {
    color: #3D95CE;
    font-size: 13px;
    text-decoration: none;
}

.detect-link:hover {
    text-decoration: underline;
}

.detected-list {
    list-style: none;
    padding: 0;
    margin: 0 0 16px;
    font-size: 13px;
    color: #94a3b8;
}

.detected-list li {
    padding: 4px 0;
}

.no-networks {
    font-size: 13px;
    color: #64748b;
    margin-bottom: 16px;
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

.chain-confirmed {
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
    font-weight: 500;
}

.cors-warning {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: rgba(245, 158, 11, 0.08);
    border: 1px solid rgba(245, 158, 11, 0.2);
    border-radius: 8px;
    margin-bottom: 20px;
    color: #F59E0B;
    font-size: 13px;
    font-weight: 500;
}

.step-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 28px;
}

.action-btns {
    display: flex;
    gap: 8px;
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
</style>
```

- [ ] **Step 2: Update OnboardingWizard.vue to use the new component**

In `src/components/OnboardingWizard.vue`:

**Replace the import** (line 241):
```javascript
// Remove this:
import CreateWorkspace from './CreateWorkspace.vue';
// Add this:
import OnboardingWorkspaceSetup from './OnboardingWorkspaceSetup.vue';
```

**Replace the template** (lines 49-54):
```html
<!-- Remove this: -->
<CreateWorkspace
    v-else-if="currentStep === 1 && selectedPath === 'private'"
    :is-onboarding="true"
    @workspace-created="onPrivateWorkspaceSetup"
    @back="currentStep = 0"
/>
<!-- Add this: -->
<OnboardingWorkspaceSetup
    v-else-if="currentStep === 1 && selectedPath === 'private'"
    :initial-name="setupData.workspaceName || ''"
    :initial-rpc="setupData.rpcServer || ''"
    @workspace-info-ready="onWorkspaceInfoReady"
    @back="currentStep = 0"
/>
```

**Replace the handler** `onPrivateWorkspaceSetup` (lines 305-320):
```javascript
// Remove onPrivateWorkspaceSetup, add:
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
```

- [ ] **Step 3: Commit**

```bash
git add src/components/OnboardingWorkspaceSetup.vue src/components/OnboardingWizard.vue
git commit -m "feat(onboarding): add workspace setup component for private flow"
```

---

### Task 3: Add Sign-in Toggle to OnboardingSignup

**Files:**
- Modify: `src/components/OnboardingSignup.vue`

- [ ] **Step 1: Add sign-in mode to OnboardingSignup.vue**

Update `src/components/OnboardingSignup.vue`. Add a `mode` ref and a new `signin-complete` emit. The template conditionally shows different title/button text and the footer toggles between modes.

In `<script setup>`, add:
```javascript
const emit = defineEmits(['signup-complete', 'signin-complete', 'back']);
const mode = ref('signup');
```

Update the template title and subtitle to be mode-aware:
```html
<div class="step-label">Step 3 of 4</div>
<h2 class="step-title">{{ mode === 'signup' ? 'Create your account' : 'Sign in' }}</h2>
<p class="step-subtitle">{{ mode === 'signup'
    ? `One last step to get your ${path === 'public' ? 'explorer' : 'workspace'} running.`
    : `Sign in to continue setting up your ${path === 'public' ? 'explorer' : 'workspace'}.` }}</p>
```

Update the submit button text:
```html
{{ mode === 'signup' ? 'Create Account' : 'Sign In' }}
```

Add sign-in logic to the `submit` function:
```javascript
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

        // Existing signup logic unchanged
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
```

Add the mode toggle footer inside `OnboardingSignup.vue`'s template, after the `</v-form>` closing tag:
```html
</v-form>

<div class="signup-footer">
    <template v-if="mode === 'signup'">
        Already have an account? <a href="#" class="wizard-link" @click.prevent="mode = 'signin'">Sign in</a>
    </template>
    <template v-else>
        Don't have an account? <a href="#" class="wizard-link" @click.prevent="mode = 'signup'">Sign up</a>
    </template>
</div>
```

Add the footer CSS in `OnboardingSignup.vue`'s `<style scoped>`:
```css
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
```

- [ ] **Step 2: Update OnboardingWizard.vue footer**

In `src/components/OnboardingWizard.vue`, remove the static footer for step 2 (lines 82-84):
```html
<!-- Remove this: -->
<div v-if="currentStep === 2" class="wizard-footer">
    Already have an account? <router-link to="/auth" class="wizard-link">Sign in</router-link>
</div>
```

The sign-in/signup toggle link is now handled inside `OnboardingSignup.vue`.

- [ ] **Step 3: Commit**

```bash
git add src/components/OnboardingSignup.vue src/components/OnboardingWizard.vue
git commit -m "feat(onboarding): add inline sign-in toggle to signup step"
```

---

### Task 4: Add Sign-in Redirect Logic

**Files:**
- Modify: `src/components/OnboardingWizard.vue` (signin handler + already-signed-in redirect)
- Modify: `src/components/Explorers.vue:105,120,187-199` (query param handling)
- Modify: `src/components/CreateExplorerModal.vue:82-83,96-101` (prefill props)
- Modify: `src/components/WorkspaceList.vue` (query param handling)
- Modify: `src/components/CreateWorkspaceModal.vue:28-33` (prefill props)

- [ ] **Step 1: Add onSigninComplete handler in OnboardingWizard.vue**

In `src/components/OnboardingWizard.vue`, add a new handler and wire it up in the template.

Add to the template where `OnboardingSignup` is rendered (around line 57-63):
```html
<OnboardingSignup
    v-else-if="currentStep === 2"
    :path="selectedPath"
    :setup-data="setupData"
    @signup-complete="onSignupComplete"
    @signin-complete="onSigninComplete"
    @back="currentStep = 1"
/>
```

Add the handler function:
```javascript
function onSigninComplete({ user }) {
    userStore.updateUser(user);
    localStorage.setItem('apiToken', user.apiToken);
    $pusher.init();
    redirectSignedInUser();
}

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
```

- [ ] **Step 2: Add already-signed-in redirect in onMounted**

In `src/components/OnboardingWizard.vue`, update `onMounted` to check if user is already signed in:

```javascript
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

    // If already signed in, redirect to in-app modals
    if (userStore.loggedIn) {
        // Pull setup data from context or URL params
        const route = router.currentRoute.value;
        if (context.value.name) setupData.value.name = context.value.name;
        if (context.value.rpc) setupData.value.rpcServer = context.value.rpc;
        if (route.query.name) setupData.value.name = route.query.name;
        if (route.query.rpc) setupData.value.rpcServer = route.query.rpc;

        const flow = context.value.flow || route.query.flow || selectedPath.value;
        selectedPath.value = flow === 'public' ? 'public' : 'private';

        redirectSignedInUser();
        return;
    }

    if (window.posthog) {
        window.posthog.capture('onboarding:flow_started', {
            source: context.value.source || 'direct',
            default_path: selectedPath.value,
            has_context: !!context.value.source
        });
    }
});
```

- [ ] **Step 3: Add prefill props to CreateExplorerModal.vue**

In `src/components/CreateExplorerModal.vue`, add props and use them to initialize form fields.

Add props (after line 76):
```javascript
const props = defineProps({
    initialName: { type: String, default: '' },
    initialRpc: { type: String, default: '' }
});
```

Update the `open` function (line 96-102) to accept and apply initial values:
```javascript
function open(options = {}) {
    const prefillName = options.name || props.initialName;
    const prefillRpc = options.rpc || props.initialRpc;
    if (prefillName) name.value = prefillName;
    if (prefillRpc) rpcServer.value = prefillRpc;
    dialog.value = true;
    return new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
}
```

- [ ] **Step 4: Add query param handling to Explorers.vue**

In `src/components/Explorers.vue`, update `onMounted` (line 187) to check for `openCreate` query param:

```javascript
onMounted(() => {
    headers.value.push(
        { title: 'Name', key: 'name' },
        { title: 'Workspace', key: 'workspace', sortable: false },
        { title: 'Domains', key: 'domain', sortable: false },
        { title: 'RPC', key: 'rpcServer', sortable: false }
    );
    getExplorers({
        page: currentOptions.page,
        itemsPerPage: currentOptions.itemsPerPage,
        sortBy: [{ key: currentOptions.orderBy, order: currentOptions.order }]
    });

    // Open create modal if redirected from onboarding
    if (route.query.openCreate) {
        createExplorerModalRef.value.open({
            name: route.query.name || '',
            rpc: route.query.rpc || ''
        }).then(getExplorers);
        router.replace({ query: {} });
    }
});
```

Add `useRouter` import and instance (add alongside existing `useRoute` at line 106-123):
```javascript
import { useRouter } from 'vue-router';
const router = useRouter();
```

- [ ] **Step 5: Add prefill support to CreateWorkspaceModal.vue**

In `src/components/CreateWorkspaceModal.vue`, update `open` to accept options:

```javascript
function open(options = {}) {
    dialog.value = true;
    // Pass prefill options to CreateWorkspace via a ref or event
    initialOptions.value = options;
    return new Promise((resolve, reject) => {
        resolveRef.value = resolve;
        rejectRef.value = reject;
    });
}
```

Add a ref and pass it as a prop to `CreateWorkspace`:
```javascript
const initialOptions = ref({});
```

Update the template:
```html
<CreateWorkspace
    @workspaceCreated="onWorkspaceCreated"
    @goToBilling="goToBilling"
    :initial-name="initialOptions.name"
    :initial-rpc="initialOptions.rpc"
/>
```

Note: `CreateWorkspace.vue` uses `<script setup>` (Composition API) and does not currently accept `initialName`/`initialRpc` props — they need to be added. Update its `defineProps` (line 58-60) and refs (lines 75-76):

```javascript
// Update defineProps:
const props = defineProps({
    isOnboarding: { type: Boolean, default: false },
    initialName: { type: String, default: '' },
    initialRpc: { type: String, default: '' }
});

// Update refs to use initial values:
const name = ref(props.initialName || null);
const rpcServer = ref(props.initialRpc || null);
```

- [ ] **Step 6: Add query param handling to WorkspaceList.vue**

In `src/components/WorkspaceList.vue`, check for `openWorkspace` query param on mount and open the modal. **Note:** `WorkspaceList.vue` uses the Options API (`export default { ... }`), so use `this.$route` and `this.$router` instead of `useRoute()`/`useRouter()`.

Add to the existing `mounted()` hook (after `this.getWorkspaces()`):
```javascript
mounted() {
    this.getWorkspaces();

    // Open create modal if redirected from onboarding
    if (this.$route.query.openWorkspace) {
        this.$refs.createWorkspaceModal.open({
            name: this.$route.query.name || '',
            rpc: this.$route.query.rpc || ''
        });
        this.$router.replace({ query: {} });
    }
},
```

Also ensure the `CreateWorkspaceModal` template ref name matches. Check the existing template — it should have `ref="createWorkspaceModal"` on the `<Create-Workspace-Modal>` component. If the ref name differs, use the actual ref name.

- [ ] **Step 7: Commit**

```bash
git add src/components/OnboardingWizard.vue src/components/Explorers.vue \
        src/components/CreateExplorerModal.vue src/components/CreateWorkspaceModal.vue \
        src/components/CreateWorkspace.vue src/components/WorkspaceList.vue
git commit -m "feat(onboarding): add sign-in redirect to in-app modals with prefill"
```

---

### Task 5: Create Enterprise Contact Modal + Backend Endpoint

**Files:**
- Create: `src/components/OnboardingEnterpriseModal.vue`
- Modify: `src/components/OnboardingExplorerLive.vue` (import modal, intercept enterprise plan)
- Modify: `run/api/onboarding.js` (new `/contact` endpoint)
- Modify: `src/plugins/server.js` (new `onboardingContact` method)

- [ ] **Step 1: Add backend endpoint**

In `run/api/onboarding.js`, add a new route before `module.exports`:

```javascript
/**
 * POST /api/onboarding/contact
 * Sends an enterprise contact inquiry email via Mailjet.
 * Public endpoint — no auth required.
 *
 * @param {string} req.body.contact - Point of contact (email, Telegram, Discord)
 * @param {string} req.body.message - Freeform message
 * @param {string} [req.body.explorerName] - Explorer name from onboarding context
 * @param {string} [req.body.rpcServer] - RPC URL from onboarding context
 * @param {string} [req.body.email] - Signup email from onboarding context
 * @returns {200} on success
 */
const contactRateLimit = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: 'Too many requests. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false
});

router.post('/contact', contactRateLimit, async (req, res, next) => {
    const { contact, message, explorerName, rpcServer, email } = req.body;

    try {
        if (!contact || !message)
            return managedError(new Error('Missing required fields: contact and message.'), req, res);

        const { getMailjetPublicKey, getMailjetPrivateKey, getDemoExplorerSender } = require('../lib/env');
        const Mailjet = require('node-mailjet');
        const mailjet = Mailjet.apiConnect(getMailjetPublicKey(), getMailjetPrivateKey());

        const senderRaw = getDemoExplorerSender();
        const senderMatch = senderRaw ? senderRaw.match(/^(.+?)\s*<(.+)>$/) : null;
        const senderEmail = senderMatch ? senderMatch[2] : (senderRaw || 'noreply@tryethernal.com');
        const senderName = senderMatch ? senderMatch[1].trim() : 'Ethernal';

        // Escape HTML to prevent XSS in email body
        const esc = (str) => (str || 'N/A').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

        const htmlBody = `
            <h2>Enterprise Inquiry</h2>
            <p><strong>Point of contact:</strong> ${esc(contact)}</p>
            <p><strong>Message:</strong></p>
            <p>${esc(message).replace(/\n/g, '<br>')}</p>
            <hr>
            <h3>Onboarding Context</h3>
            <ul>
                <li><strong>Explorer Name:</strong> ${esc(explorerName)}</li>
                <li><strong>RPC Server:</strong> ${esc(rpcServer)}</li>
                <li><strong>Signup Email:</strong> ${esc(email)}</li>
            </ul>
        `;

        await mailjet.post('send', { version: 'v3.1' }).request({
            Messages: [{
                From: { Email: senderEmail, Name: senderName },
                To: [{ Email: 'antoine@tryethernal.com' }],
                Subject: `Enterprise inquiry from ${contact}`,
                HTMLPart: htmlBody,
                CustomID: `enterprise-contact-${Date.now()}`
            }]
        });

        res.sendStatus(200);
    } catch (error) {
        unmanagedError(error, req, next);
    }
});
```

- [ ] **Step 2: Add server plugin method**

In `src/plugins/server.js`, add after the `onboardingSetup` method (around line 1263):

```javascript
/**
 * Send enterprise contact inquiry from onboarding.
 * @param {object} data - { contact, message, explorerName, rpcServer, email }
 * @returns {Promise}
 */
onboardingContact(data) {
    const resource = `${envStore.apiRoot}/api/onboarding/contact`;
    return axios.post(resource, data);
},
```

- [ ] **Step 3: Create OnboardingEnterpriseModal.vue**

Create `src/components/OnboardingEnterpriseModal.vue`:

```vue
<!--
    @fileoverview Enterprise contact modal for onboarding wizard.
    Two-column layout: contact info on left, form on right.
    @component OnboardingEnterpriseModal
-->
<template>
    <v-dialog v-model="dialog" max-width="540" scrim="black" class="enterprise-modal-overlay">
        <div class="enterprise-modal">
            <!-- Form state -->
            <div v-if="!sent" class="enterprise-modal-layout">
                <!-- Left: Contact info -->
                <div class="enterprise-left">
                    <div class="enterprise-label">Get in touch</div>
                    <h3 class="enterprise-heading">Let's talk</h3>
                    <p class="enterprise-desc">We'll get back to you within 24 hours.</p>

                    <div class="contact-list">
                        <div class="contact-item">
                            <div class="contact-icon">
                                <v-icon size="16" color="#3D95CE">mdi-email-outline</v-icon>
                            </div>
                            <div>
                                <div class="contact-type">Email</div>
                                <div class="contact-value">antoine@tryethernal.com</div>
                            </div>
                        </div>
                        <div class="contact-item">
                            <div class="contact-icon">
                                <v-icon size="16" color="#3D95CE">mdi-send</v-icon>
                            </div>
                            <div>
                                <div class="contact-type">Telegram</div>
                                <div class="contact-value">@antoinedc</div>
                            </div>
                        </div>
                        <div class="contact-item">
                            <div class="contact-icon">
                                <v-icon size="16" color="#3D95CE">mdi-forum-outline</v-icon>
                            </div>
                            <div>
                                <div class="contact-type">Discord</div>
                                <div class="contact-value">@adechevigne</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Right: Form -->
                <div class="enterprise-right">
                    <div class="enterprise-form-title">Send us a message</div>

                    <v-form @submit.prevent="submit" v-model="formValid">
                        <div class="field-group">
                            <label class="field-label">Point of contact</label>
                            <v-text-field
                                v-model="contact"
                                placeholder="Email, Telegram, or Discord handle"
                                variant="outlined"
                                rounded="lg"
                                density="comfortable"
                                :rules="[v => !!v || 'Required']"
                                :disabled="loading"
                                bg-color="rgba(255,255,255,0.03)"
                                hide-details="auto"
                            />
                        </div>

                        <div class="field-group">
                            <label class="field-label">Message</label>
                            <v-textarea
                                v-model="message"
                                placeholder="Tell us about your project and requirements..."
                                variant="outlined"
                                rounded="lg"
                                density="comfortable"
                                :rules="[v => !!v || 'Required']"
                                :disabled="loading"
                                rows="3"
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

                        <v-btn
                            color="#3D95CE"
                            size="large"
                            rounded="lg"
                            block
                            type="submit"
                            :loading="loading"
                            :disabled="!formValid"
                            class="submit-btn"
                        >
                            Send Message
                            <v-icon end>mdi-arrow-right</v-icon>
                        </v-btn>
                    </v-form>
                </div>
            </div>

            <!-- Confirmation state -->
            <div v-else class="enterprise-confirmation">
                <v-icon size="48" color="#22C55E">mdi-check-circle</v-icon>
                <h3 class="confirmation-title">Message sent!</h3>
                <p class="confirmation-desc">Someone will get back to you within 24 hours.</p>
                <v-btn
                    variant="outlined"
                    color="#64748b"
                    rounded="lg"
                    block
                    class="close-btn"
                    @click="close"
                >
                    Close
                </v-btn>
            </div>
        </div>
    </v-dialog>
</template>

<script setup>
import { ref, inject } from 'vue';

const props = defineProps({
    explorerName: { type: String, default: '' },
    rpcServer: { type: String, default: '' },
    email: { type: String, default: '' }
});

const $server = inject('$server');

const dialog = ref(false);
const contact = ref('');
const message = ref('');
const formValid = ref(false);
const loading = ref(false);
const errorMsg = ref('');
const sent = ref(false);

function open() {
    dialog.value = true;
    sent.value = false;
    contact.value = '';
    message.value = '';
    errorMsg.value = '';
}

function close() {
    dialog.value = false;
}

async function submit() {
    if (!formValid.value) return;
    loading.value = true;
    errorMsg.value = '';

    try {
        await $server.onboardingContact({
            contact: contact.value,
            message: message.value,
            explorerName: props.explorerName,
            rpcServer: props.rpcServer,
            email: props.email
        });
        sent.value = true;
    } catch (error) {
        errorMsg.value = error.response?.data || 'Failed to send message. Please try again.';
    } finally {
        loading.value = false;
    }
}

defineExpose({ open });
</script>

<style scoped>
.enterprise-modal {
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 16px;
    overflow: hidden;
}

.enterprise-modal-layout {
    display: flex;
    min-height: 380px;
}

/* Left column */
.enterprise-left {
    width: 40%;
    padding: 32px 24px;
    background: linear-gradient(160deg, #1a2744 0%, #0d1829 100%);
    border-right: 1px solid #1e293b;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.enterprise-label {
    font-size: 11px;
    color: #3D95CE;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 16px;
}

.enterprise-heading {
    font-size: 18px;
    font-weight: 700;
    color: #fff;
    margin-bottom: 8px;
}

.enterprise-desc {
    font-size: 13px;
    color: #64748b;
    margin-bottom: 24px;
    line-height: 1.6;
}

.contact-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.contact-item {
    display: flex;
    align-items: center;
    gap: 10px;
}

.contact-icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: rgba(61, 149, 206, 0.12);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.contact-type {
    font-size: 11px;
    color: #64748b;
}

.contact-value {
    font-size: 13px;
    color: #94a3b8;
}

/* Right column */
.enterprise-right {
    flex: 1;
    padding: 32px 24px;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.enterprise-form-title {
    font-size: 16px;
    font-weight: 700;
    color: #fff;
    margin-bottom: 20px;
}

.field-group {
    margin-bottom: 16px;
}

.field-label {
    font-size: 12px;
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
    margin-bottom: 16px;
    color: #EF4444;
    font-size: 13px;
}

.submit-btn {
    text-transform: none;
    font-weight: 600;
    letter-spacing: 0;
    max-height: 48px;
}

/* Confirmation state */
.enterprise-confirmation {
    padding: 48px 32px;
    text-align: center;
}

.confirmation-title {
    font-size: 20px;
    font-weight: 700;
    color: #fff;
    margin: 16px 0 8px;
}

.confirmation-desc {
    font-size: 14px;
    color: #64748b;
    margin-bottom: 24px;
    line-height: 1.6;
}

.close-btn {
    text-transform: none;
    font-weight: 600;
    letter-spacing: 0;
}

:deep(.v-field__input) {
    color: #fff !important;
}
</style>

<style>
.enterprise-modal-overlay .v-overlay__scrim {
    backdrop-filter: blur(8px) !important;
    -webkit-backdrop-filter: blur(8px) !important;
    opacity: 0.75 !important;
}
</style>
```

- [ ] **Step 4: Integrate modal in OnboardingExplorerLive.vue**

In `src/components/OnboardingExplorerLive.vue`:

Add import:
```javascript
import OnboardingEnterpriseModal from './OnboardingEnterpriseModal.vue';
```

Add ref:
```javascript
const enterpriseModalRef = ref(null);
```

Add the modal to the template (after the closing `</div>` of `.explorer-live`, before `</template>`):
```html
<OnboardingEnterpriseModal
    ref="enterpriseModalRef"
    :explorer-name="explorer?.name || ''"
    :rpc-server="explorer?.rpcServer || ''"
/>
```

Update `confirmPlan` to intercept enterprise selection:
```javascript
function confirmPlan() {
    if (selectedPlan.value === 'enterprise') {
        enterpriseModalRef.value.open();
        return;
    }

    const isTrial = selectedPlan.value !== 'free' && selectedPlan.value !== 'enterprise';
    if (window.posthog) {
        window.posthog.capture('onboarding:plan_selected', {
            plan_slug: selectedPlan.value,
            is_trial: isTrial,
            source: 'onboarding_wizard'
        });
    }
    emit('plan-selected', { planSlug: selectedPlan.value, isTrial });
}
```

- [ ] **Step 5: Commit**

```bash
git add run/api/onboarding.js src/plugins/server.js \
        src/components/OnboardingEnterpriseModal.vue \
        src/components/OnboardingExplorerLive.vue
git commit -m "feat(onboarding): add enterprise contact modal and email endpoint"
```
