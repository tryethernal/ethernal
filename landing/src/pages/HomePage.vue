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
    title: 'Open-Source EVM Block Explorer, Live in 5 Minutes | Ethernal',
    meta: [
        { name: 'description', content: 'Run a block explorer for any EVM chain from an RPC URL. Hosted for you or self-hosted under MIT. Verified contracts, tracing, tokens. Free plan.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'Open-Source EVM Block Explorer, Live in 5 Minutes | Ethernal' },
        { property: 'og:description', content: 'Run a block explorer for any EVM chain from an RPC URL. Hosted for you or self-hosted under MIT. Verified contracts, tracing, tokens. Free plan.' },
        { property: 'og:url', content: 'https://tryethernal.com/' },
        { property: 'og:image', content: 'https://tryethernal.com/images/og-image.png' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'Open-Source EVM Block Explorer, Live in 5 Minutes | Ethernal' },
        { name: 'twitter:description', content: 'Run a block explorer for any EVM chain from an RPC URL. Hosted for you or self-hosted under MIT. Verified contracts, tracing, tokens. Free plan.' },
    ],
    link: [
        { rel: 'canonical', href: 'https://tryethernal.com/' }
    ],
    script: [
        {
            type: 'application/ld+json',
            children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Organization",
                "name": "Ethernal",
                "url": "https://tryethernal.com",
                "logo": "https://tryethernal.com/images/og-image.png",
                "description": "Open source block explorer for EVM-based chains.",
                "sameAs": [
                    "https://github.com/tryethernal/ethernal",
                    "https://twitter.com/tryethernal",
                    "https://discord.gg/jEAprf45jj"
                ]
            })
        },
        {
            type: 'application/ld+json',
            children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "WebSite",
                "name": "Ethernal",
                "url": "https://tryethernal.com",
                "description": "Deploy your own block explorer in 5 minutes. Open source, fully customizable, works with any EVM chain.",
                "publisher": {
                    "@type": "Organization",
                    "name": "Ethernal",
                    "url": "https://tryethernal.com"
                }
            })
        },
        {
            type: 'application/ld+json',
            children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "SoftwareApplication",
                "name": "Ethernal",
                "url": "https://tryethernal.com",
                "applicationCategory": "DeveloperApplication",
                "operatingSystem": "Web",
                "description": "Deploy your own block explorer in 5 minutes. Open source, fully customizable, works with any EVM chain. Just needs an RPC URL.",
                "offers": {
                    "@type": "Offer",
                    "price": "0",
                    "priceCurrency": "USD"
                },
                "author": {
                    "@type": "Organization",
                    "name": "Ethernal",
                    "url": "https://tryethernal.com"
                }
            })
        }
    ]
});
</script>
