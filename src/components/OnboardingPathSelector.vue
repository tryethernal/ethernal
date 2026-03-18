<!--
    @fileoverview OnboardingPathSelector component — step 1 of the onboarding wizard.
    @component OnboardingPathSelector
    @prop {String} defaultPath - Pre-selected path ('public' or 'private'). Defaults to 'private'.
    @emits path-selected - Emitted with the chosen path string when the user confirms.
-->
<template>
    <div class="path-selector">
        <h2 class="text-h5 font-weight-bold mb-2">What would you like to set up?</h2>
        <p class="text-body-2 text-medium-emphasis mb-8">You can always switch later.</p>

        <v-row justify="center" class="path-cards">
            <v-col cols="12" sm="6" style="max-width: 340px;">
                <v-card
                    :class="['path-card', { 'path-card--selected': selected === 'public' }]"
                    @click="select('public')"
                    variant="outlined"
                    rounded="xl"
                >
                    <v-card-text class="pa-6 text-center">
                        <v-icon size="48" class="mb-4" :color="selected === 'public' ? 'primary' : 'grey'">
                            mdi-earth
                        </v-icon>
                        <div class="text-h6 font-weight-bold mb-2">Public Block Explorer</div>
                        <div class="text-body-2 text-medium-emphasis">
                            Deploy a public-facing explorer for your chain with custom domain, branding, and analytics.
                        </div>
                    </v-card-text>
                </v-card>
            </v-col>
            <v-col cols="12" sm="6" style="max-width: 340px;">
                <v-card
                    :class="['path-card', { 'path-card--selected': selected === 'private' }]"
                    @click="select('private')"
                    variant="outlined"
                    rounded="xl"
                >
                    <v-card-text class="pa-6 text-center">
                        <v-icon size="48" class="mb-4" :color="selected === 'private' ? 'primary' : 'grey'">
                            mdi-laptop
                        </v-icon>
                        <div class="text-h6 font-weight-bold mb-2">Private Dev Workspace</div>
                        <div class="text-body-2 text-medium-emphasis">
                            Connect to your local Hardhat or Anvil node for development and debugging.
                        </div>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>

        <div class="text-center mt-8">
            <v-btn color="primary" size="large" rounded="xl" @click="confirm" :disabled="!selected">
                Continue
                <v-icon end>mdi-arrow-right</v-icon>
            </v-btn>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue';

/**
 * @type {Object} props
 * @property {String} defaultPath - Pre-selected path ('public' or 'private').
 */
const props = defineProps({
    defaultPath: { type: String, default: 'private' }
});

const emit = defineEmits(['path-selected']);

const selected = ref(props.defaultPath);

/**
 * Sets the selected path.
 * @param {String} path - 'public' or 'private'
 */
function select(path) {
    selected.value = path;
}

/**
 * Emits the confirmed path to the parent.
 */
function confirm() {
    emit('path-selected', selected.value);
}
</script>

<style scoped>
.path-card {
    cursor: pointer;
    transition: all 0.2s ease;
    border: 2px solid transparent;
}
.path-card:hover {
    border-color: rgba(var(--v-theme-primary), 0.3);
}
.path-card--selected {
    border-color: rgb(var(--v-theme-primary));
    background: rgba(var(--v-theme-primary), 0.04);
}
</style>
