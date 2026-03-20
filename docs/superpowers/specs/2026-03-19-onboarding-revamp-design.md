# Onboarding Wizard Revamp: Sign-in, Private Flow, Enterprise Contact

**Date**: 2026-03-19
**Branch**: `feat/onboarding-revamp`
**Status**: Approved

## Overview

Extends the redesigned onboarding wizard (60/40 split-screen, 4-step flow) with sign-in support, a redesigned private workspace flow, an Enterprise contact modal, and supporting backend changes.

## Scope

Five independent work items, ordered by dependency:

1. Plan selection button sizing fix
2. Private workspace flow redesign
3. Sign-in integration + signed-in user redirect
4. Enterprise contact modal
5. Backend email endpoint for enterprise contact

---

## 1. Plan Selection Button Sizing Fix

**Problem**: The CTA button in the plan detail panel (`OnboardingExplorerLive.vue`) renders with excessive height due to Vuetify's `size="large"` + `block` props.

**Fix**: Add `max-height: 48px` to the `.plan-detail-cta` class.

**Files changed**:
- `src/components/OnboardingExplorerLive.vue` (CSS only)

---

## 2. Private Workspace Flow

**Problem**: Step 1 for the private path reuses `CreateWorkspace.vue` with `isOnboarding=true`, which doesn't match the wizard's dark-themed styling and has broken behavior.

**Solution**: New component `OnboardingWorkspaceSetup.vue` that matches the wizard design.

### Component: `OnboardingWorkspaceSetup.vue`

**Props**:
- `initialName: String` (default: `''`)
- `initialRpc: String` (default: `''`)

**Emits**:
- `workspace-info-ready` — `{ name, rpcServer, chain, networkId }`
- `back`

**UI** (matches `OnboardingExplorerSetup.vue` styling):
- Step label: "Step 2 of 4"
- Title: "Set up your workspace"
- Fields:
  - Workspace Name (required, `v-text-field`)
  - RPC Server URL (required, `v-text-field`)
  - Chain (dropdown, populated from `envStore.chains`)
- "Detect Networks" link for auto-discovering local chains on ports 7545, 8545, 9545
- Safari CORS warning (same detection as `CreateWorkspace.vue`)
- Back / Continue buttons

**RPC Validation** (browser-side):
- Uses `$server.initRpcServer()` which sends `eth_chainId`/`net_version` directly from the browser
- On success: stores `networkId`, advances to step 2
- On failure: shows warning ("We couldn't validate this RPC, this may be due to CORS restrictions. You can continue anyway.") with a "Continue anyway" option
- Does NOT block progress on validation failure (local nodes may not be reachable due to CORS)

**Changes in `OnboardingWizard.vue`**:
- Replace `<CreateWorkspace v-else-if="currentStep === 1 && selectedPath === 'private'"...>` with `<OnboardingWorkspaceSetup>`
- Remove `CreateWorkspace` import
- Update `onPrivateWorkspaceSetup` handler to match new emit shape

---

## 3. Sign-in Integration

Three sub-parts: inline sign-in form, redirect logic, and already-signed-in handling.

### 3a. Inline Sign-in on Step 2

**Changes in `OnboardingSignup.vue`**:
- Add a `mode` ref (`'signup'` | `'signin'`), default `'signup'`
- When `mode === 'signin'`: show only email + password fields with "Sign In" button
- When `mode === 'signup'`: show current signup form (unchanged)
- Footer link toggles between modes:
  - In signup mode: "Already have an account? **Sign in**" (sets `mode = 'signin'`)
  - In sign-in mode: "Don't have an account? **Sign up**" (sets `mode = 'signup'`)
- Sign-in calls `$server.signIn(email, password)`, updates `userStore`, then emits a new `signin-complete` event with `{ user }` and the setup data context

### 3b. Redirect Signed-in Users to In-app Modals

**Changes in `OnboardingWizard.vue`**:
- New handler `onSigninComplete({ user })`:
  - Sets user in `userStore`
  - Reads `setupData` and `selectedPath`
  - Redirects based on path:
    - `public`: `router.push({ path: '/explorers', query: { openCreate: 'true', name: setupData.name, rpc: setupData.rpcServer } })`
    - `private`: `router.push({ path: '/settings', query: { openWorkspace: 'true', name: setupData.name, rpc: setupData.rpcServer } })`

**Changes in `Explorers.vue`**:
- On mount: check `route.query.openCreate`
- If present: call `createExplorerModal.value.open()` (existing imperative pattern)
- Pass `route.query.name` and `route.query.rpc` as initial values
- After opening modal: `router.replace({ query: {} })` to strip params (prevents re-trigger on refresh)

**Changes in `CreateExplorerModal.vue`**:
- Accept optional `initialName` and `initialRpc` props
- Prefill form fields from props when provided

**Changes in `Settings.vue`**:
- On mount: check `route.query.openWorkspace`
- If present: open `CreateWorkspaceModal` with prefilled values
- After opening modal: `router.replace` to strip the openWorkspace/name/rpc params

**Changes in `CreateWorkspaceModal.vue`**:
- Accept optional `initialName` and `initialRpc` props
- Prefill form fields from props when provided

### 3c. Already Signed-in User on `/onboarding`

**Changes in `OnboardingWizard.vue` `onMounted`**:
- After loading `onboardingContext` from sessionStorage, check `userStore.loggedIn`
- If signed in: redirect immediately using the same logic as 3b, reading flow/name/rpc from the onboarding context or URL query params

---

## 4. Enterprise Contact Modal

**New component**: `OnboardingEnterpriseModal.vue`

**Trigger**: Clicking "Contact Us" button when Enterprise plan is selected in `OnboardingExplorerLive.vue`.

**Layout**: `v-dialog`, max-width ~540px, two-column:

- **Left column** (40%, gradient background matching wizard context panel):
  - "Get in touch" label
  - "Let's talk" heading
  - "We'll get back to you within 24 hours" subtitle
  - Contact methods with `mdi-*` icons (not emojis):
    - `mdi-email-outline` — antoine@tryethernal.com
    - `mdi-send` — @antoinedc (Telegram)
    - `mdi-forum-outline` or similar — @adechevigne (Discord)

- **Right column** (60%):
  - "Send us a message" heading
  - "Point of contact" text field (email, Telegram, or Discord handle)
  - "Message" textarea (freeform)
  - "Send Message" button

**States**:
- **Form state**: default, shows the two-column layout
- **Confirmation state**: replaces entire modal content with green `mdi-check-circle` icon (on dark background, no colored circle wrapper), "Message sent!" heading, "Someone will get back to you within 24 hours" subtitle, "Close" button

**Styling**: Dark theme (`#0f172a` background, `#1e293b` borders, white text, `#3D95CE` accent), consistent with wizard.

**On submit**:
- POST to `/api/onboarding/contact` with contact, message, and onboarding context (explorerName, rpcServer, email)
- On success: transition to confirmation state
- On error: show inline error message

**On close**: User returns to step 4 (plan selection). No side effects.

**Changes in `OnboardingExplorerLive.vue`**:
- Import and render `OnboardingEnterpriseModal`
- When `confirmPlan` is called with `selectedPlan === 'enterprise'`: open the modal instead of emitting `plan-selected`

**Changes in `OnboardingWizard.vue`**: None for this item.

---

## 5. Backend Email Endpoint

**New endpoint**: `POST /api/onboarding/contact` (added to `run/api/onboarding.js`)

**Request body**:
```json
{
  "contact": "user@example.com",
  "message": "We're building an L2...",
  "explorerName": "My Chain",
  "rpcServer": "https://rpc.mychain.com",
  "email": "signup-email@example.com"
}
```

**Behavior**:
1. Rate-limited (reuse `setupRateLimit` — 10 requests per minute)
2. Validate required fields: `contact`, `message`
3. Send email via Mailjet to `antoine@tryethernal.com`:
   - From: configured sender (same as drip emails, via `getDemoExplorerSender()` or a dedicated onboarding sender env var)
   - Subject: `"Enterprise inquiry from [contact]"`
   - Body (HTML): structured display of all fields (contact, message, explorer name, RPC, signup email)
   - CustomID: `enterprise-contact-[timestamp]`
4. Return `200` on success, `400` on validation error, `500` on Mailjet failure

**No auth required** — public endpoint. Rate limiting provides abuse protection.

**Server plugin** (`src/plugins/server.js`):
- New method: `onboardingContact(data)` — POST to `/api/onboarding/contact`

---

## Files Summary

| File | Change |
|------|--------|
| `src/components/OnboardingExplorerLive.vue` | Button fix CSS, enterprise modal integration |
| `src/components/OnboardingWorkspaceSetup.vue` | **New** — private workspace setup |
| `src/components/OnboardingSignup.vue` | Sign-in toggle mode |
| `src/components/OnboardingWizard.vue` | Replace CreateWorkspace, signin handler, signed-in redirect |
| `src/components/OnboardingEnterpriseModal.vue` | **New** — enterprise contact modal |
| `src/components/Explorers.vue` | Read query params, open modal prefilled |
| `src/components/CreateExplorerModal.vue` | Accept initialName/initialRpc props |
| `src/components/Settings.vue` | Read query params, open modal prefilled |
| `src/components/CreateWorkspaceModal.vue` | Accept initialName/initialRpc props |
| `run/api/onboarding.js` | New `/contact` endpoint |
| `src/plugins/server.js` | New `onboardingContact()` method |

## Out of Scope

- Stripe checkout redirect flow (existing `createStripeExplorerCheckoutSession` works as-is for users who pick Team/App Chain after sign-in)
- Trial creation from Enterprise modal (removed from scope per discussion)
- Restyling existing in-app modals (only adding prefill prop support)
