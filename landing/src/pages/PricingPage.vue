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

        <v-container class="faq-section" style="max-width: 720px;">
            <div class="text-overline mb-1 text-center" style="letter-spacing: 0.1em; color: #5DAAE0; font-size: 11px;">FAQ</div>
            <h2 class="text-h4 font-weight-bold text-center mb-12" style="font-family: 'Exo', sans-serif;">Frequently Asked Questions</h2>
            <div class="faq-list">
                <div class="faq-item">
                    <h3 class="faq-question">Is Ethernal free to use?</h3>
                    <p class="faq-answer">
                        Yes. Ethernal offers free plans for both public and private explorers.
                        <br>The public Starter plan gives you an ad-supported explorer with contract verification, token tracking, and a testnet faucet.
                        <br>The private Free plan includes 1 workspace with unlimited blocks, transaction decoding, tracing, contract interaction, and Hardhat/Anvil sync.
                        <br>No credit card required for either.
                    </p>
                </div>
                <div class="faq-item">
                    <h3 class="faq-question">Can I use Ethernal with any EVM chain?</h3>
                    <p class="faq-answer">Yes. Ethernal works with any EVM-compatible chain including OP Stack rollups, Arbitrum Orbit chains, Polygon CDK, and any custom EVM network. Just provide an RPC URL.</p>
                </div>
                <div class="faq-item">
                    <h3 class="faq-question">How long does it take to set up?</h3>
                    <p class="faq-answer">Under 5 minutes. Create an account, enter your chain's RPC URL, and your explorer is live. No server setup, no Docker, no infrastructure to manage.</p>
                </div>
                <div class="faq-item">
                    <h3 class="faq-question">Do I need to run my own infrastructure?</h3>
                    <p class="faq-answer">No. Ethernal is a hosted service. We handle the indexing, storage, and serving. You just point us at your RPC endpoint.</p>
                </div>
                <div class="faq-item">
                    <h3 class="faq-question">Can I use my own branding?</h3>
                    <p class="faq-answer">
                        Yes. The App Chain plan includes full whitelabel branding: your logo, colors, and custom domain.
                        <br>The Team plan includes a custom domain.
                        <br>Your explorer looks like your product.
                    </p>
                </div>
            </div>
        </v-container>

        <LandingCTA />
    </LandingLayout>
</template>

<script setup>
import { useHead } from '@vueuse/head';
import LandingLayout from '@/components/LandingLayout.vue';
import LandingPricing from '@/components/LandingPricing.vue';
import LandingCTA from '@/components/LandingCTA.vue';

useHead({
    title: 'Pricing — Ethernal Block Explorer',
    meta: [
        { name: 'description', content: 'Free and paid plans for Ethernal block explorer. Deploy on any EVM chain with transaction decoding, contract verification, and real-time sync.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'Pricing — Ethernal Block Explorer' },
        { property: 'og:description', content: 'Free and paid plans for Ethernal block explorer. Deploy on any EVM chain with transaction decoding, contract verification, and real-time sync.' },
        { property: 'og:url', content: 'https://tryethernal.com/pricing' },
        { property: 'og:image', content: 'https://tryethernal.com/images/og-image.png' },
        { name: 'twitter:card', content: 'summary_large_image' },
    ],
    link: [
        { rel: 'canonical', href: 'https://tryethernal.com/pricing' }
    ],
    script: [
        {
            type: 'application/ld+json',
            children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Product",
                "name": "Ethernal Block Explorer",
                "description": "Deploy your own block explorer for any EVM chain. Transaction decoding, contract verification, and real-time sync.",
                "url": "https://tryethernal.com/pricing",
                "image": "https://tryethernal.com/images/og-image.png",
                "brand": { "@type": "Organization", "name": "Ethernal" },
                "offers": [
                    { "@type": "Offer", "name": "Starter", "price": "0", "priceCurrency": "USD", "description": "Ad-supported explorer with contract verification, token tracking, and testnet faucet" },
                    { "@type": "Offer", "name": "Team", "description": "Custom domain, native token, L1 explorer, no ads, 100k transactions included", "priceSpecification": { "@type": "UnitPriceSpecification", "price": 150, "priceCurrency": "USD", "unitCode": "MON" } },
                    { "@type": "Offer", "name": "App Chain", "description": "Full whitelabel with custom branding, status page, total supply, 5M transactions included", "priceSpecification": { "@type": "UnitPriceSpecification", "price": 500, "priceCurrency": "USD", "unitCode": "MON" } }
                ]
            })
        },
        {
            type: 'application/ld+json',
            children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                "mainEntity": [
                    {
                        "@type": "Question",
                        "name": "Is Ethernal free to use?",
                        "acceptedAnswer": { "@type": "Answer", "text": "Yes. Ethernal offers free plans for both public and private explorers. The public Starter plan gives you an ad-supported explorer with contract verification, token tracking, and a testnet faucet. The private Free plan includes 1 workspace with unlimited blocks, transaction decoding, tracing, contract interaction, and Hardhat/Anvil sync. No credit card required for either." }
                    },
                    {
                        "@type": "Question",
                        "name": "Can I use Ethernal with any EVM chain?",
                        "acceptedAnswer": { "@type": "Answer", "text": "Yes. Ethernal works with any EVM-compatible chain including OP Stack rollups, Arbitrum Orbit chains, Polygon CDK, and any custom EVM network. Just provide an RPC URL." }
                    },
                    {
                        "@type": "Question",
                        "name": "How long does it take to set up?",
                        "acceptedAnswer": { "@type": "Answer", "text": "Under 5 minutes. Create an account, enter your chain's RPC URL, and your explorer is live. No server setup, no Docker, no infrastructure to manage." }
                    },
                    {
                        "@type": "Question",
                        "name": "Do I need to run my own infrastructure?",
                        "acceptedAnswer": { "@type": "Answer", "text": "No. Ethernal is a hosted service. We handle the indexing, storage, and serving. You just point us at your RPC endpoint." }
                    },
                    {
                        "@type": "Question",
                        "name": "Can I use my own branding?",
                        "acceptedAnswer": { "@type": "Answer", "text": "Yes. The App Chain plan includes full whitelabel branding: your logo, colors, and custom domain. The Team plan includes a custom domain. Your explorer looks like your product." }
                    }
                ]
            })
        },
        {
            type: 'application/ld+json',
            children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                "itemListElement": [
                    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://tryethernal.com/" },
                    { "@type": "ListItem", "position": 2, "name": "Pricing", "item": "https://tryethernal.com/pricing" }
                ]
            })
        }
    ]
});
</script>

<style scoped>
.page-title-bar { padding-bottom: 24px; margin-bottom: 8px; border-bottom: 1px solid var(--drawer-divider); }

.faq-section {
    padding-top: 80px;
    padding-bottom: 80px;
}

.faq-list {
    display: flex;
    flex-direction: column;
}

.faq-item {
    padding: 28px 0;
    border-bottom: 1px solid var(--border-subtle);
}

.faq-item:first-child {
    border-top: 1px solid var(--border-subtle);
}

.faq-question {
    font-family: 'Exo', sans-serif;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 10px;
    line-height: 1.4;
}

.faq-answer {
    font-size: 0.9rem;
    color: var(--text-secondary);
    line-height: 1.7;
    margin: 0;
}
</style>
