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

        <v-container class="py-16">
            <h2 class="text-h4 font-weight-bold text-center mb-8" style="font-family: 'Exo', sans-serif;">Frequently Asked Questions</h2>
            <v-row justify="center">
                <v-col cols="12" md="8">
                    <v-expansion-panels variant="accordion" class="faq-panels">
                        <v-expansion-panel title="Is Ethernal free to use?">
                            <v-expansion-panel-text>
                                Yes. Ethernal offers free plans for both public and private explorers. The public Starter plan gives you an ad-supported explorer with contract verification, token tracking, and a testnet faucet. The private Free plan includes 1 workspace with unlimited blocks, transaction decoding, tracing, contract interaction, and Hardhat/Anvil sync. No credit card required for either.
                            </v-expansion-panel-text>
                        </v-expansion-panel>
                        <v-expansion-panel title="Can I use Ethernal with any EVM chain?">
                            <v-expansion-panel-text>
                                Yes. Ethernal works with any EVM-compatible chain including OP Stack rollups, Arbitrum Orbit chains, Polygon CDK, and any custom EVM network. Just provide an RPC URL.
                            </v-expansion-panel-text>
                        </v-expansion-panel>
                        <v-expansion-panel title="How long does it take to set up?">
                            <v-expansion-panel-text>
                                Under 5 minutes. Create an account, enter your chain's RPC URL, and your explorer is live. No server setup, no Docker, no infrastructure to manage.
                            </v-expansion-panel-text>
                        </v-expansion-panel>
                        <v-expansion-panel title="Do I need to run my own infrastructure?">
                            <v-expansion-panel-text>
                                No. Ethernal is a hosted service. We handle the indexing, storage, and serving. You just point us at your RPC endpoint.
                            </v-expansion-panel-text>
                        </v-expansion-panel>
                        <v-expansion-panel title="Can I use my own branding?">
                            <v-expansion-panel-text>
                                Yes. The App Chain plan includes full whitelabel branding: your logo, colors, and custom domain. The Team plan includes a custom domain. Your explorer looks like your product.
                            </v-expansion-panel-text>
                        </v-expansion-panel>
                    </v-expansion-panels>
                </v-col>
            </v-row>
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
</style>
