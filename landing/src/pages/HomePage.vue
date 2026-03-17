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
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'Ethernal — Block Explorer for EVM Chains' },
        { property: 'og:description', content: 'Deploy your own block explorer in 5 minutes. Open source, fully customizable, works with any EVM chain. Just needs an RPC URL.' },
        { property: 'og:url', content: 'https://tryethernal.com/' },
        { property: 'og:image', content: 'https://tryethernal.com/images/og-image.png' },
        { name: 'twitter:card', content: 'summary_large_image' },
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
                    "https://twitter.com/tryabornedev"
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
