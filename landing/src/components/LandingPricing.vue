<template>
    <section class="landing-section">
        <v-container style="max-width: 1200px;">
            <div class="text-center mb-14">
                <h2 class="font-heading mb-4" :style="{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }">
                    Simple, <span class="gradient-text">transparent pricing</span>
                </h2>
                <p :style="{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto', lineHeight: 1.7 }">
                    Start free, upgrade when you need more. No hidden fees, no surprises.
                </p>
            </div>

            <!-- Public Explorers -->
            <div v-if="full" class="font-heading text-h6 mb-6" :style="{ fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '1px', textTransform: 'uppercase', fontSize: '13px !important' }">
                Public Explorers
            </div>

            <v-row class="pricing-row">
                <v-col
                    v-for="plan in publicPlans"
                    :key="plan.name"
                    cols="12"
                    sm="6"
                    lg="3"
                >
                    <PricingCard v-bind="plan" @enterprise-contact="enterpriseModal.open()" />
                </v-col>
            </v-row>

            <EnterpriseContactModal ref="enterpriseModal" />

            <!-- Private Explorers (full page only) -->
            <template v-if="full">
                <div class="font-heading text-h6 mt-16 mb-6" :style="{ fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '1px', textTransform: 'uppercase', fontSize: '13px !important' }">
                    Private Explorers
                </div>
                <v-row class="pricing-row">
                    <v-col
                        v-for="plan in privatePlans"
                        :key="plan.name"
                        cols="12"
                        sm="6"
                        lg="3"
                    >
                        <PricingCard v-bind="plan" />
                    </v-col>
                </v-row>
            </template>

            <div v-if="!full" class="text-center mt-10">
                <router-link to="/pricing" class="view-all-link">
                    View all plans
                    <v-icon size="18" class="ml-1">mdi-arrow-right</v-icon>
                </router-link>
            </div>
        </v-container>
    </section>
</template>

<script setup>
import { ref } from 'vue';
import PricingCard from './PricingCard.vue';
import EnterpriseContactModal from './EnterpriseContactModal.vue';

const enterpriseModal = ref(null);

const appUrl = __APP_URL__;

defineProps({
    full: { type: Boolean, default: false }
});

const publicPlans = [
    {
        name: 'Starter',
        price: 0,
        subtitle: 'Basic explorer with ads',
        quota: 'Unlimited transactions',
        features: [
            'Contract verification',
            'Token & NFT tracking',
            'Testnet faucet',
            'Ethernal branding'
        ],
        ctaText: 'Start Free',
        ctaUrl: `${appUrl}/auth?flow=public&plan=free`
    },
    {
        name: 'Team',
        price: 150,
        subtitle: 'For teams sharing a testnet',
        highlighted: true,
        quota: '100k transactions included',
        features: [
            'Everything in Starter',
            'Custom domain',
            'Custom native token',
            'No ads',
            'L2 bridge support',
            '7-day free trial'
        ],
        ctaText: 'Start Trial',
        ctaUrl: `${appUrl}/auth?flow=public&plan=explorer-150`
    },
    {
        name: 'App Chain',
        price: 500,
        subtitle: 'White-label for L1s and L2s',
        quota: '5M transactions included',
        features: [
            'Everything in Team',
            'Custom branding & themes',
            'Total supply display',
            'Status page',
            'Priority support',
            '7-day free trial'
        ],
        ctaText: 'Start Trial',
        ctaUrl: `${appUrl}/auth?flow=public&plan=explorer-500`
    },
    {
        name: 'Enterprise',
        price: 'Custom',
        subtitle: 'For high-volume chains',
        quota: 'Unlimited transactions',
        features: [
            'Everything in App Chain',
            'On-premise hosting',
            'Custom integrations',
            'Dedicated support'
        ],
        ctaText: 'Contact Us'
    }
];

const privatePlans = [
    {
        name: 'Free',
        price: 0,
        subtitle: 'For local development',
        features: [
            '1 workspace',
            'Unlimited blocks',
            'Transaction decoding & tracing',
            'Contract interaction',
            'Hardhat / Anvil sync',
            'Analytics'
        ],
        ctaText: 'Start Free',
        ctaUrl: `${appUrl}/auth?flow=private`
    },
    {
        name: 'Pro',
        price: 20,
        subtitle: 'For multiple projects',
        features: [
            'Everything in Free',
            'Unlimited workspaces'
        ],
        ctaText: 'Get Pro',
        ctaUrl: `${appUrl}/auth?flow=private&plan=pro`
    }
];
</script>

<style scoped>
.pricing-row {
    align-items: stretch;
    margin-top: 14px;
}

.view-all-link {
    color: #5DAAE0;
    text-decoration: none;
    font-size: 15px;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    transition: color 0.2s;
}
.view-all-link:hover {
    color: #8BC4E8;
}
</style>
