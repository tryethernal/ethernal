<!--
    @fileoverview Path selector for onboarding wizard.
    Shows two cards: Public Block Explorer vs Private Dev Workspace.
    Designed for the left panel of the split-screen wizard layout.
    @component OnboardingPathSelector
    @emits path-selected - Emitted with 'public' or 'private' when user confirms
-->
<template>
    <div class="path-selector">
        <div class="path-step-label">Step 1 of 4</div>
        <h2 class="path-title">What would you like to set up?</h2>
        <p class="path-subtitle">You can always switch later.</p>

        <div class="path-cards">
            <div
                :class="['path-card', { 'path-card--selected': selected === 'public' }]"
                @click="select('public')"
            >
                <div class="path-card-icon">
                    <v-icon size="24" :color="selected === 'public' ? '#3D95CE' : '#64748b'">mdi-earth</v-icon>
                </div>
                <div class="path-card-content">
                    <div class="path-card-title">Public Block Explorer</div>
                    <div class="path-card-desc">Deploy a public-facing explorer for your chain.</div>
                </div>
                <div class="path-card-radio">
                    <div :class="['radio-dot', { 'radio-dot--active': selected === 'public' }]" />
                </div>
            </div>

            <div
                :class="['path-card', { 'path-card--selected': selected === 'private' }]"
                @click="select('private')"
            >
                <div class="path-card-icon">
                    <v-icon size="24" :color="selected === 'private' ? '#3D95CE' : '#64748b'">mdi-laptop</v-icon>
                </div>
                <div class="path-card-content">
                    <div class="path-card-title">Private Dev Workspace</div>
                    <div class="path-card-desc">Connect to Hardhat or Anvil for local development.</div>
                </div>
                <div class="path-card-radio">
                    <div :class="['radio-dot', { 'radio-dot--active': selected === 'private' }]" />
                </div>
            </div>
        </div>

        <div class="path-actions">
            <v-btn
                color="#3D95CE"
                size="large"
                rounded="lg"
                @click="confirm"
                :disabled="!selected"
                block
                class="path-continue-btn"
            >
                Continue
                <v-icon end>mdi-arrow-right</v-icon>
            </v-btn>
        </div>
        <div class="path-footer">
            Already have an account? <a href="#" class="wizard-link" @click.prevent="$emit('signin')">Sign in</a>
        </div>
    </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
    defaultPath: { type: String, default: 'private' }
});

const emit = defineEmits(['path-selected', 'signin']);

const selected = ref(props.defaultPath);

watch(() => props.defaultPath, (newPath) => {
    selected.value = newPath;
});

function select(path) {
    selected.value = path;
}

function confirm() {
    emit('path-selected', selected.value);
}
</script>

<style scoped>
.path-step-label {
    font-size: 12px;
    color: #3D95CE;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 8px;
}

.path-title {
    font-size: 24px;
    font-weight: 700;
    color: #fff;
    margin-bottom: 6px;
}

.path-subtitle {
    font-size: 14px;
    color: #64748b;
    margin-bottom: 28px;
}

.path-cards {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 28px;
}

.path-card {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px;
    border: 1px solid #1e293b;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    background: rgba(255, 255, 255, 0.02);
}

.path-card:hover {
    border-color: rgba(61, 149, 206, 0.3);
    background: rgba(61, 149, 206, 0.04);
}

.path-card--selected {
    border-color: #3D95CE;
    background: rgba(61, 149, 206, 0.06);
}

.path-card-icon {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.04);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.path-card--selected .path-card-icon {
    background: rgba(61, 149, 206, 0.1);
}

.path-card-content {
    flex: 1;
    min-width: 0;
}

.path-card-title {
    font-size: 14px;
    font-weight: 600;
    color: #fff;
    margin-bottom: 2px;
}

.path-card-desc {
    font-size: 13px;
    color: #64748b;
}

.path-card-radio {
    flex-shrink: 0;
}

.radio-dot {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 2px solid #334155;
    transition: all 0.2s ease;
}

.radio-dot--active {
    border-color: #3D95CE;
    background: #3D95CE;
    box-shadow: inset 0 0 0 3px #0a0f1a;
}

.path-continue-btn {
    text-transform: none;
    font-weight: 600;
    letter-spacing: 0;
}

.path-footer {
    font-size: 13px;
    color: #475569;
    margin-top: 24px;
    text-align: center;
}

.wizard-link {
    color: #3D95CE;
    text-decoration: none;
}

.wizard-link:hover {
    text-decoration: underline;
}
</style>
