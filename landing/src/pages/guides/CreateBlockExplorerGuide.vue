<!--
  @fileoverview Guide: how to create a block explorer for an EVM chain.
  @component CreateBlockExplorerGuide
  Targets "create a block explorer", "how to build a block explorer". Every step is traced to the
  app onboarding wizard (src/components/Onboarding*.vue), the explorer settings screens and the
  existing landing comparison pages. Rendered by the shared GuideLayout.
-->
<template>
    <GuideLayout :guide="guide">
        <template #extra>
            <section class="my-12">
                <h2 class="cbe-h2">Pick your path</h2>
                <div class="cbe-paths">
                    <div class="cbe-path">
                        <v-icon size="22" style="color: #5DAAE0;">mdi-hammer-wrench</v-icon>
                        <h3>Build it in-house</h3>
                        <p>A minimum viable explorer takes 2-3 senior engineers 3-6 months, and production-grade features take longer. Only worth it if the explorer is your core product.</p>
                        <router-link to="/build-vs-buy-block-explorer" class="cbe-link">Read build vs buy</router-link>
                    </div>
                    <div class="cbe-path">
                        <v-icon size="22" style="color: #5DAAE0;">mdi-docker</v-icon>
                        <h3>Self-host open source</h3>
                        <p>Run Ethernal's MIT-licensed code on your own server with Docker Compose. You own the infrastructure and the data.</p>
                        <router-link to="/guides/self-host-block-explorer" class="cbe-link">Follow the self-hosting guide</router-link>
                    </div>
                    <div class="cbe-path">
                        <v-icon size="22" style="color: #5DAAE0;">mdi-cloud-outline</v-icon>
                        <h3>Use hosted Ethernal</h3>
                        <p>Ethernal indexes and serves the explorer for you. You bring an RPC URL. The steps below cover this path.</p>
                        <router-link to="/launch-block-explorer" class="cbe-link">About block explorer hosting</router-link>
                    </div>
                </div>
            </section>
        </template>
    </GuideLayout>
</template>

<script setup>
import GuideLayout from '@/components/GuideLayout.vue';

const guide = {
    slug: 'create-block-explorer',
    metaTitle: 'How to Create a Block Explorer for an EVM Chain',
    metaDescription: 'Create a block explorer for your EVM chain: build it, self-host Ethernal, or use hosted Ethernal. Step-by-step setup from an RPC URL, free plan available.',
    kicker: 'Create a Block Explorer',
    h1: 'How to Create a Block Explorer for an EVM Chain',
    intro: 'You can create a block explorer three ways: build one in-house, self-host open-source software, or use a hosted service. This guide compares the three, then walks through the hosted path with Ethernal: enter an RPC URL, create an account, pick a plan, and your explorer goes live.',
    needs: [
        'The RPC URL of your EVM chain. It must be reachable from the internet, so a localhost address will not work.',
        'A name for your explorer.',
        'An email address and a password of at least 6 characters.'
    ],
    steps: [
        {
            title: 'Start the setup',
            text: 'Open the sign-up flow at app.tryethernal.com: choose Get Started on the sign-in screen, or use the button on this page. On the "What would you like to set up?" screen, select Public Block Explorer and click Continue.'
        },
        {
            title: 'Enter your explorer name and RPC URL',
            text: 'Fill in Explorer Name and RPC Server URL, then click Continue. Ethernal queries the RPC to detect your chain and shows "Connected to chain" with its chain ID. If the RPC cannot be queried, the form shows an error and you stay on this step.'
        },
        {
            title: 'Create your account',
            text: 'Enter an email and a password of at least 6 characters. Creating the account also creates your explorer.'
        },
        {
            title: 'Choose a plan',
            text: 'The last step shows Starter (free, ad-supported), Team ($150/month), App Chain ($500/month) and Enterprise (custom, via a contact form). The paid plans start with a 7-day free trial and the screen says no credit card is needed. You can start on Starter.'
        },
        {
            title: 'Open your explorer',
            text: 'Once you pick a plan, a confirmation shows your explorer\'s address on tryethernal.com and a Go to Dashboard button. Your explorer starts syncing blocks from your chain right away.'
        },
        {
            title: 'Adjust the settings',
            text: 'In your explorer\'s settings you can rename it and change its Frontend RPC Server (the RPC exposed to wallets and other end users) and its Ethernal Domain. Paid plans add more: a custom domain and native token on Team, and custom branding (logo, favicon, font, colors, banner text) on App Chain. For a custom domain you add the DNS record shown in the Add Domain Alias dialog.'
        },
        {
            title: 'Add L2 bridge tracking if your chain needs it',
            text: 'If your chain is an OP Stack or Arbitrum Orbit rollup, the explorer settings have an OP Stack tab and an Orbit Chain tab where you enter your bridge contract addresses. Both have their own guides, linked below.'
        }
    ],
    faqs: [
        {
            q: 'Do I need to run an indexer or a database to create a block explorer with Ethernal?',
            a: 'Not on the hosted path. Ethernal indexes your chain from the RPC URL you provide and serves the explorer. You still need an RPC endpoint for your chain. If you would rather run everything yourself, use the self-hosting guide.'
        },
        {
            q: 'Why is my RPC URL rejected?',
            a: 'The hosted service has to query your RPC from its own servers. The error reads "Our servers can\'t query this RPC. Please use an RPC that is reachable from the internet." Check the URL for typos, make sure the endpoint is public and not behind a firewall or a localhost address, then try again. For a local Hardhat or Anvil chain, pick Private Dev Workspace in the first step instead, or self-host.'
        },
        {
            q: 'How much does it cost?',
            a: 'Starter is free and ad-supported. Team is $150 per month with a custom domain and no ads. App Chain is $500 per month with full white-label branding. Enterprise is custom. Paid plans include a 7-day free trial. See the pricing page for the full feature list.'
        },
        {
            q: 'Can I use my own domain and branding?',
            a: 'Yes, on paid plans. A custom domain is part of Team, and custom branding and themes are part of App Chain. On Starter your explorer keeps Ethernal branding.'
        },
        {
            q: 'Is Ethernal open source?',
            a: 'Yes, it is MIT licensed and the source is on GitHub. That means you can move from hosted to self-hosted later.'
        }
    ],
    related: [
        { to: '/guides/self-host-block-explorer', icon: 'mdi-docker', title: 'Self-Host a Block Explorer with Docker', desc: 'Run Ethernal on your own server' },
        { to: '/guides/op-stack-block-explorer', icon: 'mdi-layers-outline', title: 'Block Explorer for an OP Stack Chain', desc: 'Add deposit, withdrawal and batch tracking' },
        { to: '/guides/arbitrum-orbit-block-explorer', icon: 'mdi-orbit-variant', title: 'Block Explorer for an Arbitrum Orbit Chain', desc: 'Add bridge and withdrawal tracking' },
        { to: '/pricing', icon: 'mdi-tag-outline', title: 'Pricing', desc: 'Starter (free), Team ($150/mo), App Chain ($500/mo), Enterprise' },
        { to: '/build-vs-buy-block-explorer', icon: 'mdi-scale-balance', title: 'Build vs Buy', desc: 'Cost and timeline of building an explorer yourself' }
    ],
    cta: { label: 'Create your explorer' },
    secondaryCta: { label: 'View on GitHub', href: 'https://github.com/tryethernal/ethernal' }
};
</script>

<style scoped>
.cbe-h2 { color: var(--text-primary); font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em; margin-bottom: 20px; }
.cbe-paths { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.cbe-path { padding: 22px; background: var(--glass-bg); border: 1px solid var(--drawer-divider); border-radius: 12px; display: flex; flex-direction: column; gap: 8px; }
.cbe-path h3 { color: var(--text-primary); font-size: 1rem; font-weight: 600; margin: 0; }
.cbe-path p { color: var(--text-secondary); font-size: 0.88rem; line-height: 1.65; margin: 0; flex: 1; }
.cbe-link { color: #5DAAE0; font-size: 0.88rem; font-weight: 500; text-decoration: none; }
.cbe-link:hover { text-decoration: underline; }
@media (max-width: 900px) { .cbe-paths { grid-template-columns: 1fr; } }
</style>
