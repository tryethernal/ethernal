<template>
    <LandingLayout>
        <div class="page-hero">
            <v-container style="max-width: 1200px;">
                <div class="text-overline mb-2" style="letter-spacing: 0.1em; color: #5DAAE0;">USE CASE</div>
                <h1 class="font-heading text-white mb-3" style="font-weight: 700; font-size: clamp(1.8rem, 4vw, 2.8rem); letter-spacing: -0.02em;">Built for App Chains</h1>
                <p class="text-body-1" style="color: #94A3B8; max-width: 550px; margin: 0 auto;">
                    Launching an Orbit, OP Stack, or custom EVM chain? Get a production-ready explorer with branding, analytics, and bridge support.
                </p>
            </v-container>
        </div>

        <section class="landing-section">
            <v-container style="max-width: 1200px;">
                <FeatureSection
                    icon="mdi-palette"
                    title="Your Brand, Your Explorer"
                    description="Custom logo, colors, domain, and page title. Your explorer is indistinguishable from a first-party product. Users see your brand — not ours."
                />
                <FeatureSection
                    icon="mdi-chart-bar"
                    title="Network Stats at a Glance"
                    description="Total transactions, daily active addresses, gas usage trends, and block times. Give your community real-time insight into network health and growth."
                    :reverse="true"
                />
                <FeatureSection
                    icon="mdi-image-multiple"
                    title="NFT Support"
                    description="Full ERC-721 and ERC-1155 support with rich media previews. Display collections, individual tokens, transfer history, and ownership — out of the box."
                />
                <FeatureSection
                    icon="mdi-bridge"
                    title="L2 Bridge Monitoring"
                    description="Built-in support for Arbitrum Orbit and OP Stack bridges. Track deposits, withdrawals, and batch submissions between L1 and L2 with dedicated views."
                    :reverse="true"
                />
                <FeatureSection
                    icon="mdi-flash"
                    title="Ready in 5 Minutes"
                    description="No complex infrastructure to provision. Ethernal needs just your RPC URL. Create an account, paste your endpoint, and your explorer is live in minutes."
                />
            </v-container>
        </section>

        <LandingCTA />
    </LandingLayout>
</template>

<script setup>
import LandingLayout from '@/components/LandingLayout.vue';
import FeatureSection from '@/components/FeatureSection.vue';
import LandingCTA from '@/components/LandingCTA.vue';
</script>
