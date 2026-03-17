<template>
    <LandingLayout>
        <LandingHero />
        <LandingFeatures />
        <LandingL2 />
        <LandingSocialProof />
        <LandingOpenSource />
        <LandingPricing />
        <LandingCTA />
    </LandingLayout>
</template>

<script setup>
import { useHead } from '@vueuse/head';
import LandingLayout from '@/components/LandingLayout.vue';
import LandingHero from '@/components/LandingHero.vue';
import LandingFeatures from '@/components/LandingFeatures.vue';
import LandingL2 from '@/components/LandingL2.vue';
import LandingSocialProof from '@/components/LandingSocialProof.vue';
import LandingOpenSource from '@/components/LandingOpenSource.vue';
import LandingPricing from '@/components/LandingPricing.vue';
import LandingCTA from '@/components/LandingCTA.vue';

useHead({
    title: 'Ethernal — Block Explorer for EVM Chains',
    meta: [
        { name: 'description', content: 'Deploy your own block explorer in 5 minutes. Open source, fully customizable, works with any EVM chain. Just needs an RPC URL.' },
        { property: 'og:title', content: 'Ethernal — Block Explorer for EVM Chains' },
        { property: 'og:description', content: 'Deploy your own block explorer in 5 minutes. Open source, fully customizable, works with any EVM chain. Just needs an RPC URL.' },
        { property: 'og:url', content: 'https://tryethernal.com/' },
        { property: 'og:image', content: 'https://tryethernal.com/images/og-image.png' },
        { name: 'twitter:card', content: 'summary_large_image' },
    ],
    link: [
        { rel: 'canonical', href: 'https://tryethernal.com/' }
    ]
});
</script>
