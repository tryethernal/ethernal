<!--
    @fileoverview Explorer live step — plan selection after explorer creation.
    Two-column layout: compact plan cards on left, feature detail panel on right.
    @component OnboardingExplorerLive
    @emits plan-selected - Emitted with { planSlug, isTrial }
-->
<template>
    <div class="explorer-live">
        <div class="step-label">Last step</div>

        <!-- Plan selection: two-column layout -->
        <div class="plan-section-title">Choose a plan</div>
        <div class="plan-section-desc">7-day free trial on paid plans. No credit card needed.</div>

        <div class="plan-layout">
            <!-- Left column: stacked plan cards -->
            <div class="plan-list">
                <div
                    v-for="plan in plans"
                    :key="plan.slug"
                    :class="['plan-list-card', { 'plan-list-card--selected': selectedPlan === plan.slug }]"
                    @click="selectedPlan = plan.slug"
                >
                    <div v-if="plan.badge" class="plan-list-badge">{{ plan.badge }}</div>
                    <div class="plan-list-row">
                        <div>
                            <div class="plan-list-name">{{ plan.name }}</div>
                            <div class="plan-list-desc">{{ plan.description }}</div>
                        </div>
                        <div class="plan-list-price">
                            <template v-if="plan.price === 'Custom'">Custom</template>
                            <template v-else-if="plan.price === 0">Free</template>
                            <template v-else>${{ plan.price }}<span class="plan-list-period">/mo</span></template>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Right column: feature detail panel -->
            <div class="plan-detail">
                <div class="plan-detail-inner">
                    <div class="plan-detail-name">{{ activePlan.name }}</div>
                    <div class="plan-detail-price-row">
                        <template v-if="activePlan.price === 'Custom'">
                            <span class="plan-detail-price">Custom</span>
                        </template>
                        <template v-else-if="activePlan.price === 0">
                            <span class="plan-detail-price">$0</span>
                            <span class="plan-detail-period">/month</span>
                        </template>
                        <template v-else>
                            <span class="plan-detail-price">${{ activePlan.price }}</span>
                            <span class="plan-detail-period">/month</span>
                        </template>
                    </div>
                    <div class="plan-detail-subtitle">{{ activePlan.description }}</div>

                    <div v-if="activePlan.quota" class="plan-detail-quota">
                        <v-icon size="14" color="#5DAAE0" class="mr-1">mdi-database-outline</v-icon>
                        {{ activePlan.quota }}
                    </div>

                    <div class="plan-detail-features">
                        <div
                            v-for="feature in activePlan.features"
                            :key="feature"
                            class="plan-detail-feature"
                        >
                            <v-icon size="16" color="#22C55E" class="flex-shrink-0">mdi-check-circle</v-icon>
                            <span>{{ feature }}</span>
                        </div>
                    </div>

                    <v-btn
                        color="#3D95CE"
                        size="large"
                        rounded="lg"
                        block
                        @click="confirmPlan"
                        class="plan-detail-cta"
                    >
                        {{ selectedPlan === 'free' ? 'Continue with Free' : selectedPlan === 'enterprise' ? 'Contact Us' : 'Start 7-Day Trial' }}
                        <v-icon end>mdi-arrow-right</v-icon>
                    </v-btn>
                </div>
            </div>
        </div>
    </div>

    <OnboardingEnterpriseModal
        ref="enterpriseModalRef"
        :explorer-name="explorer?.name || ''"
        :rpc-server="explorer?.rpcServer || ''"
    />
</template>

<script setup>
import { ref, computed } from 'vue';
import OnboardingEnterpriseModal from './OnboardingEnterpriseModal.vue';

const props = defineProps({
    explorer: { type: Object, required: true },
    defaultPlan: { type: String, default: 'explorer-150' }
});

const emit = defineEmits(['plan-selected']);
const selectedPlan = ref(props.defaultPlan);
const enterpriseModalRef = ref(null);

const explorerUrl = computed(() => {
    if (!props.explorer) return '';
    const slug = props.explorer.slug || props.explorer.name?.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `https://${slug}.tryethernal.com`;
});

const plans = [
    {
        slug: 'free',
        name: 'Starter',
        price: 0,
        description: 'Basic explorer with ads',
        quota: 'Unlimited transactions',
        features: [
            'Contract verification',
            'Token & NFT tracking',
            'Testnet faucet',
            'Ethernal branding'
        ]
    },
    {
        slug: 'explorer-150',
        name: 'Team',
        price: 150,
        description: 'For teams sharing a testnet',
        badge: 'Best Value',
        quota: '100k transactions included',
        features: [
            'Everything in Starter',
            'Custom domain',
            'Custom native token',
            'No ads',
            'L2 bridge support',
            '7-day free trial'
        ]
    },
    {
        slug: 'explorer-500',
        name: 'App Chain',
        price: 500,
        description: 'White-label for L1s and L2s',
        quota: '5M transactions included',
        features: [
            'Everything in Team',
            'Custom branding & themes',
            'Total supply display',
            'Status page',
            'Priority support',
            '7-day free trial'
        ]
    },
    {
        slug: 'enterprise',
        name: 'Enterprise',
        price: 'Custom',
        description: 'For high-volume chains',
        quota: 'Unlimited transactions',
        features: [
            'Everything in App Chain',
            'Multiple explorers',
            'Custom integrations',
            'Dedicated support'
        ]
    }
];

const activePlan = computed(() => plans.find(p => p.slug === selectedPlan.value) || plans[0]);

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
</script>

<style scoped>
.step-label {
    font-size: 12px;
    color: #3D95CE;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 10px;
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

/* Two-column plan layout */
.plan-layout {
    display: flex;
    gap: 16px;
}

/* Left column: stacked plan cards */
.plan-list {
    width: 40%;
    display: flex;
    flex-direction: column;
    gap: 16px;
    flex-shrink: 0;
}

.plan-list-card {
    padding: 14px 16px;
    border: 1px solid #1e293b;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
    background: rgba(255, 255, 255, 0.02);
    position: relative;
}

.plan-list-card:hover {
    border-color: rgba(61, 149, 206, 0.3);
}

.plan-list-card--selected {
    border-color: #3D95CE;
    background: rgba(61, 149, 206, 0.06);
}

.plan-list-badge {
    position: absolute;
    top: -8px;
    right: 10px;
    background: #3D95CE;
    color: #fff;
    font-size: 9px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 100px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    white-space: nowrap;
}

.plan-list-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.plan-list-name {
    font-size: 14px;
    font-weight: 600;
    color: #fff;
    margin-bottom: 3px;
}

.plan-list-desc {
    font-size: 12px;
    color: #64748b;
}

.plan-list-price {
    font-size: 15px;
    font-weight: 700;
    color: #fff;
    white-space: nowrap;
    flex-shrink: 0;
    margin-left: 12px;
}

.plan-list-period {
    font-size: 11px;
    color: #64748b;
    font-weight: 400;
}

/* Right column: feature detail panel */
.plan-detail {
    flex: 1;
    min-width: 0;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid #1e293b;
    border-radius: 12px;
    padding: 20px;
    min-height: 380px;
}

.plan-detail-inner {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.plan-detail-name {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #64748b;
    margin-bottom: 8px;
}

.plan-detail-price-row {
    display: flex;
    align-items: baseline;
    margin-bottom: 4px;
}

.plan-detail-price {
    font-size: 28px;
    font-weight: 900;
    color: #fff;
    letter-spacing: -0.02em;
    line-height: 1;
}

.plan-detail-period {
    font-size: 14px;
    color: #64748b;
    font-weight: 500;
    margin-left: 4px;
}

.plan-detail-subtitle {
    font-size: 13px;
    color: #64748b;
    margin-bottom: 14px;
}

.plan-detail-quota {
    display: flex;
    align-items: center;
    padding: 6px 12px;
    border-radius: 8px;
    background: rgba(30, 41, 59, 0.6);
    border: 1px solid #1e293b;
    color: #94a3b8;
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 14px;
    width: fit-content;
}

.plan-detail-features {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
    margin-bottom: 16px;
}

.plan-detail-feature {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: #94a3b8;
}

.plan-detail-cta {
    text-transform: none;
    font-weight: 600;
    letter-spacing: 0;
    margin-top: auto;
    max-height: 48px;
}

/* Mobile: stack columns */
@media (max-width: 600px) {
    .plan-layout {
        flex-direction: column;
    }

    .plan-list {
        width: 100%;
    }
}
</style>
