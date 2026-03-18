<!--
    @fileoverview Explorer live step — shows explorer URL and plan selection.
    Styled for the left panel of the split-screen wizard.
    @component OnboardingExplorerLive
    @emits plan-selected - Emitted with { planSlug, isTrial }
    @emits skipped - Emitted when user clicks skip
-->
<template>
    <div class="explorer-live">
        <div class="step-label">Step 4 of 4</div>
        <h2 class="step-title">Your explorer is live!</h2>
        <p class="step-subtitle">Your explorer is now syncing data from your chain.</p>

        <!-- Explorer URL preview -->
        <div class="explorer-url-card">
            <div>
                <div class="explorer-url-label">Explorer URL</div>
                <div class="explorer-url-value">{{ explorerUrl }}</div>
            </div>
            <a :href="explorerUrl" target="_blank" class="preview-link">
                Preview <v-icon size="14">mdi-open-in-new</v-icon>
            </a>
        </div>

        <!-- Plan selection -->
        <div class="plan-section-title">Choose a plan</div>
        <div class="plan-section-desc">7-day free trial on paid plans. No credit card needed.</div>

        <div class="plan-cards">
            <div
                v-for="plan in plans"
                :key="plan.slug"
                :class="['plan-card', { 'plan-card--selected': selectedPlan === plan.slug }]"
                @click="selectedPlan = plan.slug"
            >
                <div v-if="plan.badge" class="plan-badge">{{ plan.badge }}</div>
                <div class="plan-name">{{ plan.name }}</div>
                <div class="plan-price">
                    <template v-if="plan.price === 'Custom'">Custom</template>
                    <template v-else>${{ plan.price }}<span class="plan-period">/mo</span></template>
                </div>
                <div class="plan-desc">{{ plan.description }}</div>
            </div>
        </div>

        <v-btn
            color="#3D95CE"
            size="large"
            rounded="lg"
            block
            @click="confirmPlan"
            class="continue-btn"
        >
            {{ selectedPlan === 'free' ? 'Continue with Free' : 'Start 7-Day Trial' }}
            <v-icon end>mdi-arrow-right</v-icon>
        </v-btn>

        <div class="skip-row">
            <button class="skip-btn" @click="skip">Skip for now</button>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
    explorer: { type: Object, required: true },
    defaultPlan: { type: String, default: 'free' }
});

const emit = defineEmits(['plan-selected', 'skipped']);
const selectedPlan = ref(props.defaultPlan);

const explorerUrl = computed(() => {
    if (!props.explorer) return '';
    const slug = props.explorer.slug || props.explorer.name?.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `https://${slug}.tryethernal.com`;
});

const plans = [
    { slug: 'free', name: 'Starter', price: 0, description: 'Basic explorer with ads' },
    { slug: 'explorer-150', name: 'Team', price: 150, description: 'Custom domain, no ads', badge: 'Best Value' },
    { slug: 'explorer-500', name: 'App Chain', price: 500, description: 'Full white-label' },
    { slug: 'enterprise', name: 'Enterprise', price: 'Custom', description: 'High-volume chains' }
];

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
    margin-bottom: 24px;
}

.explorer-url-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid #1e293b;
    border-radius: 10px;
    margin-bottom: 24px;
}

.explorer-url-label {
    font-size: 11px;
    color: #64748b;
    margin-bottom: 2px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

.explorer-url-value {
    font-size: 14px;
    color: #fff;
    font-weight: 500;
    font-family: monospace;
}

.preview-link {
    font-size: 12px;
    color: #3D95CE;
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
    flex-shrink: 0;
}

.preview-link:hover {
    text-decoration: underline;
}

.plan-section-title {
    font-size: 16px;
    font-weight: 700;
    color: #fff;
    margin-bottom: 4px;
}

.plan-section-desc {
    font-size: 13px;
    color: #64748b;
    margin-bottom: 16px;
}

.plan-cards {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    margin-bottom: 20px;
}

.plan-card {
    padding: 14px;
    border: 1px solid #1e293b;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
    background: rgba(255, 255, 255, 0.02);
    position: relative;
    text-align: center;
}

.plan-card:hover {
    border-color: rgba(61, 149, 206, 0.3);
}

.plan-card--selected {
    border-color: #3D95CE;
    background: rgba(61, 149, 206, 0.06);
}

.plan-badge {
    position: absolute;
    top: -8px;
    left: 50%;
    transform: translateX(-50%);
    background: #3D95CE;
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    white-space: nowrap;
}

.plan-name {
    font-size: 13px;
    font-weight: 600;
    color: #fff;
    margin-bottom: 4px;
}

.plan-price {
    font-size: 20px;
    font-weight: 700;
    color: #fff;
    margin-bottom: 4px;
}

.plan-period {
    font-size: 12px;
    color: #64748b;
    font-weight: 400;
}

.plan-desc {
    font-size: 12px;
    color: #64748b;
}

.continue-btn {
    text-transform: none;
    font-weight: 600;
    letter-spacing: 0;
}

.skip-row {
    text-align: center;
    margin-top: 12px;
}

.skip-btn {
    background: none;
    border: none;
    color: #475569;
    font-size: 13px;
    cursor: pointer;
    transition: color 0.2s;
}

.skip-btn:hover {
    color: #94a3b8;
}

@media (max-width: 480px) {
    .plan-cards {
        grid-template-columns: 1fr;
    }
}
</style>
