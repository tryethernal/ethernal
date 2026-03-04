<template>
    <section class="landing-section">
        <v-container style="max-width: 1200px;">
            <div class="text-center mb-14">
                <h2 class="font-heading mb-4" style="font-size: clamp(1.8rem, 4vw, 2.8rem); font-weight: 700; color: #F1F5F9; letter-spacing: -0.02em;">
                    Simple, <span class="gradient-text">transparent pricing</span>
                </h2>
                <p style="color: #94A3B8; max-width: 500px; margin: 0 auto; line-height: 1.7;">
                    Start free, upgrade when you need more. No hidden fees, no surprises.
                </p>
            </div>

            <!-- Public Explorers -->
            <div v-if="full" class="font-heading text-h6 mb-6" style="font-weight: 600; color: #94A3B8; letter-spacing: 1px; text-transform: uppercase; font-size: 13px !important;">
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
                    <PricingCard v-bind="plan" />
                </v-col>
            </v-row>

            <!-- Private Explorers (full page only) -->
            <template v-if="full">
                <div class="font-heading text-h6 mt-16 mb-6" style="font-weight: 600; color: #94A3B8; letter-spacing: 1px; text-transform: uppercase; font-size: 13px !important;">
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
import PricingCard from './PricingCard.vue';

defineProps({
    full: { type: Boolean, default: false }
});

const publicPlans = [
    {
        name: 'Free',
        price: 0,
        subtitle: 'For testing and personal projects',
        features: [
            '1 explorer',
            '10,000 blocks',
            'Transaction decoding',
            'Contract verification',
            'Ethernal branding'
        ],
        ctaText: 'Start Free'
    },
    {
        name: 'Starter',
        price: 150,
        subtitle: 'For teams launching a chain',
        highlighted: true,
        features: [
            '1 explorer',
            'Unlimited blocks',
            'Custom domain',
            'Custom branding',
            'Token transfers',
            'Analytics dashboard',
            '7-day free trial'
        ],
        ctaText: 'Start Trial'
    },
    {
        name: 'Growth',
        price: 500,
        subtitle: 'For production chains',
        features: [
            '3 explorers',
            'Unlimited blocks',
            'Everything in Starter',
            'NFT gallery',
            'L2 bridge support',
            'Priority support',
            '7-day free trial'
        ],
        ctaText: 'Start Trial'
    },
    {
        name: 'Enterprise',
        price: 'Custom',
        subtitle: 'For large-scale deployments',
        features: [
            'Unlimited explorers',
            'Unlimited blocks',
            'Everything in Growth',
            'Dedicated support',
            'Custom integrations'
        ],
        ctaText: 'Contact Us',
        ctaUrl: '/contact-us'
    }
];

const privatePlans = [
    {
        name: 'Free',
        price: 0,
        subtitle: 'For local development',
        features: [
            '1 workspace',
            '10,000 blocks',
            'Transaction decoding',
            'Contract interaction',
            'Hardhat / Anvil sync'
        ],
        ctaText: 'Start Free'
    },
    {
        name: 'Pro',
        price: 20,
        subtitle: 'For professional developers',
        features: [
            'Unlimited workspaces',
            'Unlimited blocks',
            'Everything in Free',
            'Transaction tracing',
            'Storage access',
            'Advanced analytics'
        ],
        ctaText: 'Get Pro'
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
