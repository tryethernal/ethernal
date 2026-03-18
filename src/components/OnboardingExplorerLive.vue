<!--
    @fileoverview OnboardingExplorerLive component — step 4 of the onboarding wizard (public path).
    Displays the newly created explorer URL and prompts the user to select a billing plan.
    Each paid plan carries a 7-day free trial. The free (Starter) plan is always available.
    @component OnboardingExplorerLive
    @prop {Object} explorer - The created explorer object (must include slug or name).
    @prop {String} defaultPlan - Plan slug pre-selected on mount. Defaults to 'free'.
    @emits plan-selected - Emitted with { planSlug, isTrial } when the user confirms a plan.
    @emits skipped - Emitted when the user clicks "Skip for now".
-->
<template>
    <div class="explorer-live">
        <div class="text-center mb-8">
            <v-icon size="64" color="success" class="mb-4">mdi-check-circle</v-icon>
            <h2 class="text-h5 font-weight-bold mb-2">Your explorer is live!</h2>
            <p class="text-body-2 text-medium-emphasis">
                Your explorer is now syncing data from your chain.
            </p>
        </div>

        <v-card variant="tonal" rounded="lg" class="mb-8 mx-auto" style="max-width: 500px;">
            <v-card-text class="d-flex align-center justify-space-between pa-4">
                <div>
                    <div class="text-body-2 text-medium-emphasis">Explorer URL</div>
                    <div class="text-body-1 font-weight-medium">{{ explorerUrl }}</div>
                </div>
                <v-btn
                    variant="outlined"
                    size="small"
                    rounded="lg"
                    :href="explorerUrl"
                    target="_blank"
                >
                    Preview
                    <v-icon end size="16">mdi-open-in-new</v-icon>
                </v-btn>
            </v-card-text>
        </v-card>

        <div class="text-center mb-6">
            <h3 class="text-h6 font-weight-bold mb-2">Choose a plan</h3>
            <p class="text-body-2 text-medium-emphasis">
                Each paid plan includes a 7-day free trial. No credit card needed.
            </p>
        </div>

        <v-row justify="center" class="mb-6">
            <v-col v-for="plan in plans" :key="plan.slug" cols="12" sm="6" md="3" style="max-width: 280px;">
                <v-card
                    :class="['plan-card', { 'plan-card--selected': selectedPlan === plan.slug }]"
                    @click="selectedPlan = plan.slug"
                    variant="outlined"
                    rounded="xl"
                >
                    <v-chip
                        v-if="plan.badge"
                        class="plan-badge"
                        color="primary"
                        size="small"
                    >
                        {{ plan.badge }}
                    </v-chip>
                    <v-card-text class="pa-5 text-center">
                        <div class="text-body-1 font-weight-bold mb-1">{{ plan.name }}</div>
                        <div class="text-h5 font-weight-bold mb-3">
                            <template v-if="plan.price === 'Custom'">Custom</template>
                            <template v-else>${{ plan.price }}<span class="text-body-2 text-medium-emphasis">/mo</span></template>
                        </div>
                        <div class="text-body-2 text-medium-emphasis">{{ plan.description }}</div>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>

        <div class="text-center">
            <v-btn color="primary" size="large" rounded="xl" @click="confirmPlan">
                {{ selectedPlan === 'free' ? 'Continue with Free' : 'Start 7-Day Trial' }}
                <v-icon end>mdi-arrow-right</v-icon>
            </v-btn>
            <div class="mt-3">
                <v-btn variant="text" size="small" @click="skip" class="text-medium-emphasis">
                    Skip for now
                </v-btn>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
    /** The created explorer object returned by the onboarding API. Must include slug or name. */
    explorer: { type: Object, required: true },
    /** Plan slug pre-selected when the component mounts. */
    defaultPlan: { type: String, default: 'free' }
});

const emit = defineEmits(['plan-selected', 'skipped']);

const selectedPlan = ref(props.defaultPlan);

/**
 * Derives the public explorer URL from the explorer object.
 * Uses slug if available; otherwise slugifies the name.
 * @type {import('vue').ComputedRef<string>}
 */
const explorerUrl = computed(() => {
    if (!props.explorer) return '';
    const slug = props.explorer.slug || props.explorer.name?.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `https://${slug}.tryethernal.com`;
});

/** Available billing plans shown in the plan selector. Prices match production stripe_plans. */
const plans = [
    { slug: 'free', name: 'Starter', price: 0, description: 'Basic explorer with ads' },
    { slug: 'explorer-150', name: 'Team', price: 150, description: 'Custom domain, no ads', badge: 'Best Value' },
    { slug: 'explorer-500', name: 'App Chain', price: 500, description: 'Full white-label' },
    { slug: 'enterprise', name: 'Enterprise', price: 'Custom', description: 'High-volume chains' }
];

/**
 * Fires the plan-selected event with the chosen plan slug and trial flag,
 * and tracks the selection in PostHog.
 */
function confirmPlan() {
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

/**
 * Handles the "Skip for now" action — tracks a free plan selection in PostHog
 * and emits the skipped event.
 */
function skip() {
    if (window.posthog) {
        window.posthog.capture('onboarding:plan_selected', {
            plan_slug: 'free',
            is_trial: false,
            source: 'onboarding_wizard_skip'
        });
    }

    emit('skipped');
}
</script>

<style scoped>
.plan-card {
    cursor: pointer;
    transition: all 0.2s ease;
    border: 2px solid transparent;
    position: relative;
}
.plan-card:hover {
    border-color: rgba(var(--v-theme-primary), 0.3);
}
.plan-card--selected {
    border-color: rgb(var(--v-theme-primary));
    background: rgba(var(--v-theme-primary), 0.04);
}
.plan-badge {
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
}
</style>
