<template>
    <LandingLayout>
        <v-container style="max-width: 1200px; padding-top: 100px; padding-bottom: 0;">
            <div class="page-title-bar">
                <div class="text-overline mb-1" style="letter-spacing: 0.1em; color: #5DAAE0; font-size: 11px;">PRICING</div>
                <h1 class="font-heading text-white mb-2" style="font-weight: 700; font-size: clamp(1.5rem, 3vw, 2.2rem); letter-spacing: -0.02em;">Simple, transparent pricing</h1>
                <p style="color: var(--text-secondary); max-width: 500px; line-height: 1.6; font-size: 0.95rem;">
                    Start free, upgrade when you need more. All paid public plans include a 7-day free trial.
                </p>
            </div>
        </v-container>
        <LandingPricing :full="true" />
        <LandingCTA />
    </LandingLayout>
</template>

<script setup>
import { useHead } from '@vueuse/head';

useHead({
    title: 'Pricing — Ethernal Block Explorer',
    meta: [
        { name: 'description', content: 'Free and paid plans for Ethernal block explorer. Deploy on any EVM chain with transaction decoding, contract verification, and real-time sync.' },
        { property: 'og:title', content: 'Pricing — Ethernal Block Explorer' },
        { property: 'og:description', content: 'Free and paid plans for Ethernal block explorer. Deploy on any EVM chain with transaction decoding, contract verification, and real-time sync.' },
        { property: 'og:url', content: 'https://tryethernal.com/pricing' },
        { property: 'og:image', content: 'https://tryethernal.com/images/og-image.png' },
        { name: 'twitter:card', content: 'summary_large_image' },
    ],
    link: [
        { rel: 'canonical', href: 'https://tryethernal.com/pricing' }
    ]
});
import LandingLayout from '@/components/LandingLayout.vue';
import LandingPricing from '@/components/LandingPricing.vue';
import LandingCTA from '@/components/LandingCTA.vue';
</script>

<style scoped>
.page-title-bar { padding-bottom: 24px; margin-bottom: 8px; border-bottom: 1px solid var(--drawer-divider); }
</style>
