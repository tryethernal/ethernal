<template>
    <LandingLayout>
        <div class="page-hero">
            <v-container style="max-width: 1200px;">
                <div class="text-overline mb-2" style="letter-spacing: 0.1em; color: #5DAAE0;">USE CASE</div>
                <h1 class="font-heading text-white mb-3" style="font-weight: 700; font-size: clamp(1.8rem, 4vw, 2.8rem); letter-spacing: -0.02em;">Built for Teams</h1>
                <p class="text-body-1" style="color: #94A3B8; max-width: 550px; margin: 0 auto;">
                    Give your whole team visibility into your blockchain with custom domains, shared workspaces, and seamless MetaMask integration.
                </p>
            </v-container>
        </div>

        <section class="landing-section">
            <v-container style="max-width: 1200px;">
                <FeatureSection
                    icon="mdi-web"
                    title="Custom Domains"
                    description="Run your explorer on your own domain — explorer.yourchain.com. SSL certificates are provisioned automatically. Your users get a branded, professional experience that builds trust."
                />
                <FeatureSection
                    icon="mdi-account-group"
                    title="Shared Workspaces"
                    description="Everyone on your team sees the same data. No more sharing screenshots or hex strings in Slack. Point your team to one URL and let them explore blocks, transactions, and contracts together."
                    :reverse="true"
                />
                <FeatureSection
                    icon="mdi-wallet"
                    title="MetaMask Integration"
                    description="Users can add your network to MetaMask with a single click. The 'Add to MetaMask' button on every explorer makes onboarding to your chain frictionless."
                />
                <FeatureSection
                    icon="mdi-palette"
                    title="Full Branding Control"
                    description="Upload your logo, set your color palette, customize the page title and meta tags. Your explorer looks and feels like a native part of your product — because it is."
                    :reverse="true"
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
