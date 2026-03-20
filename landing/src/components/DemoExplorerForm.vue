<template>
    <div class="demo-form" style="max-width: 640px;">
        <v-slide-x-transition mode="out-in">
            <div :key="step">
                <!-- Step 1: RPC URL -->
                <template v-if="step === 1">
                    <v-form @submit.prevent="onRpcSubmit" v-model="rpcValid">
                        <div class="pill-input-wrap">
                            <v-icon size="20" class="pill-input-icon">mdi-link-variant</v-icon>
                            <input
                                v-model="rpcServer"
                                type="url"
                                placeholder="RPC URL"
                                class="pill-input"
                                :disabled="loading"
                                required
                            />
                            <button
                                type="submit"
                                class="pill-input-btn"
                                :disabled="!rpcServer || loading"
                            >
                                Get Started
                                <v-icon size="16" class="ml-1">mdi-arrow-right</v-icon>
                            </button>
                        </div>
                        <div v-if="rpcError" class="text-error mt-2" style="font-size: 13px; padding-left: 16px;">{{ rpcError }}</div>
                    </v-form>
                </template>

                <!-- Step 2: Email -->
                <template v-else-if="step === 2">
                    <v-form @submit.prevent="submit" v-model="emailValid">
                        <div class="pill-input-wrap">
                            <v-icon size="20" class="pill-input-icon">mdi-email-outline</v-icon>
                            <input
                                v-model="email"
                                type="email"
                                placeholder="you@company.com"
                                class="pill-input"
                                :disabled="loading"
                                required
                            />
                            <button
                                type="submit"
                                class="pill-input-btn"
                                :disabled="!email || loading"
                            >
                                <template v-if="loading">
                                    <v-progress-circular size="16" width="2" indeterminate color="white" />
                                </template>
                                <template v-else>Create</template>
                            </button>
                        </div>
                        <button type="button" class="back-link mt-2" @click="reset">
                            <v-icon size="14" class="mr-1">mdi-arrow-left</v-icon>
                            Back
                        </button>
                    </v-form>
                </template>

                <!-- Success -->
                <template v-else>
                    <div class="success-banner">
                        <v-icon color="#22C55E" size="22" class="mr-3">mdi-check-circle</v-icon>
                        <span>Your demo explorer is ready! A link has been sent to your email.</span>
                    </div>
                </template>
            </div>
        </v-slide-x-transition>

        <div v-if="errorMsg" class="text-error mt-2" style="font-size: 13px; padding-left: 16px;">{{ errorMsg }}</div>
    </div>
</template>

<script setup>
import { ref } from 'vue';

const step = ref(1);
const rpcServer = ref('');
const rpcError = ref('');
const rpcValid = ref(false);
const email = ref('');
const emailValid = ref(false);
const loading = ref(false);
const errorMsg = ref('');

function isUrlValid(url) {
    try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
    } catch { return false; }
}

function onRpcSubmit() {
    rpcError.value = '';
    if (!rpcServer.value) {
        rpcError.value = 'RPC server is required';
        return;
    }
    if (!isUrlValid(rpcServer.value)) {
        rpcError.value = 'Must be a valid URL';
        return;
    }
    if (window.posthog) {
        let rpcHost = '';
        try { rpcHost = new URL(rpcServer.value).hostname; } catch {}
        window.posthog.capture('landing:demo_form_start', { rpc_host: rpcHost });
    }
    step.value = 2;
    email.value = '';
    errorMsg.value = '';
}

function reset() {
    step.value = 1;
    email.value = '';
    errorMsg.value = '';
    rpcError.value = '';
}

async function submit() {
    if (!email.value || !/.+@.+\..+/.test(email.value)) {
        errorMsg.value = 'Please enter a valid email';
        return;
    }
    loading.value = true;
    errorMsg.value = '';
    try {
        const res = await fetch('/api/demo/explorers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rpcServer: rpcServer.value, email: email.value })
        });
        if (!res.ok) {
            const body = await res.text();
            throw new Error(body || 'Failed to create explorer');
        }
        step.value = 3;
        if (window.posthog) {
            window.posthog.capture('explorer:explorer_create', {
                source: 'landing',
                is_demo: true
            });
        }
    } catch (err) {
        errorMsg.value = err.message || 'Error creating explorer. Please retry.';
    } finally {
        loading.value = false;
    }
}
</script>

<style scoped>
.pill-input-wrap {
    display: flex;
    align-items: center;
    background: var(--bg-card);
    border: 1px solid var(--btn-outline-border);
    border-radius: 100px;
    padding: 6px;
    box-shadow: var(--shadow-card);
    transition: border-color 0.2s;
}

.pill-input-wrap:focus-within {
    border-color: rgba(61, 149, 206, 0.4);
}

.pill-input-icon {
    color: var(--text-muted);
    padding-left: 12px;
    flex-shrink: 0;
}

.pill-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: var(--text-primary);
    font-size: 15px;
    padding: 0 12px;
    height: 48px;
    font-family: inherit;
}

.pill-input::placeholder {
    color: #475569;
}

.pill-input-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(90deg, #3D95CE, #5DAAE0);
    color: white;
    font-size: 13px;
    font-weight: 700;
    padding: 0 24px;
    height: 48px;
    border: none;
    border-radius: 100px;
    cursor: pointer;
    white-space: nowrap;
    letter-spacing: 0.04em;
    transition: opacity 0.2s, box-shadow 0.2s;
    flex-shrink: 0;
}

.pill-input-btn:hover:not(:disabled) {
    opacity: 0.92;
    box-shadow: 0 4px 16px rgba(61, 149, 206, 0.35);
}

.pill-input-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.back-link {
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 13px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    padding-left: 16px;
    transition: color 0.2s;
}

.back-link:hover {
    color: var(--text-secondary);
}

.success-banner {
    display: flex;
    align-items: center;
    padding: 16px 20px;
    border-radius: 16px;
    background: rgba(34, 197, 94, 0.08);
    border: 1px solid rgba(34, 197, 94, 0.2);
    color: #22C55E;
    font-weight: 500;
    font-size: 14px;
}
</style>
