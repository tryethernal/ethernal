<!--
  @fileoverview Guide: how to set up a block explorer for an Arbitrum Orbit chain.
  @component ArbitrumOrbitBlockExplorerGuide
  Every field name and requirement below is traced to src/components/ExplorerOrbitSettings.vue and the
  orbitConfig routes in run/api/explorers.js. Rendered by the shared GuideLayout.
-->
<template>
    <GuideLayout :guide="guide">
        <template #extra>
            <p class="orbit-note">
                New to Ethernal? Start with the
                <router-link to="/guides/create-block-explorer" class="orbit-link">guide to creating a block explorer</router-link>,
                then come back here. For an overview of what Ethernal tracks on Orbit chains, see
                <router-link to="/arbitrum-orbit" class="orbit-link">Block Explorer for Arbitrum Orbit Chains</router-link>.
            </p>
        </template>
    </GuideLayout>
</template>

<script setup>
import GuideLayout from '@/components/GuideLayout.vue';

const guide = {
    slug: 'arbitrum-orbit-block-explorer',
    metaTitle: 'How to Set Up a Block Explorer for an Arbitrum Orbit Chain',
    metaDescription: 'Set up an Ethernal block explorer for your Arbitrum Orbit chain: connect the RPC, pick the L1 parent, and enter the bridge and gateway contract addresses.',
    kicker: 'Arbitrum Orbit Block Explorer',
    h1: 'How to Set Up a Block Explorer for an Arbitrum Orbit Chain',
    intro: 'Create an Ethernal explorer from your Orbit chain\'s RPC URL, then open the Orbit Chain tab in its settings. Choose the L1 parent, add an L1 RPC for withdrawal claims, and enter the rollup, bridge, inbox, sequencer inbox, outbox and gateway addresses.',
    needs: [
        'An Ethernal explorer for your Orbit chain. Creating one needs the chain\'s RPC URL, reachable from the internet.',
        'An L1 RPC URL for end users. Ethernal exposes it so they can send withdrawal (L2 to L1) claim transactions. It must be reachable from the internet.',
        'Five required L1 contract addresses: Rollup, Bridge, Inbox, Sequencer Inbox and Outbox.',
        'Four required L1 gateway addresses: Gateway Router, ERC20 Gateway, WETH Gateway and Custom Gateway.',
        'Four required L2 gateway addresses: Gateway Router, ERC20 Gateway, WETH Gateway and Custom Gateway.',
        'Optional: the Challenge Manager, Validator Wallet Creator and Stake Token addresses.',
        'A parent chain to select. If it is not in the list, you create a custom one with a name and a backend RPC URL.'
    ],
    steps: [
        {
            title: 'Create an explorer for your Orbit chain',
            text: 'Sign up at app.tryethernal.com, choose Public Block Explorer, and enter your explorer name and the RPC URL of your Orbit chain. The create-a-block-explorer guide covers this flow screen by screen.'
        },
        {
            title: 'Open the Orbit Chain tab',
            text: 'Go to your explorer\'s page in the dashboard. Its settings have the tabs General, Faucet, Dex, Orbit Chain and OP Stack. Open Orbit Chain.'
        },
        {
            title: 'Choose the L1 parent chain',
            text: 'Select the L1 Parent Chain (required) from the list. Ethereum Mainnet is preselected when it is available. If your parent chain is not listed, choose Custom (Create New) and enter a Custom L1 Name and a Backend RPC Server, which Ethernal uses to sync L1 data. You cannot change the parent chain after the configuration is created.'
        },
        {
            title: 'Enter the L1 RPC for end users',
            text: 'Fill in L1 RPC Server (frontend). This RPC is exposed to your users so they can send withdrawal (L2 to L1) claim transactions from the explorer. Because it is exposed, avoid an endpoint with a private API key you cannot share. Ethernal checks that it can reach the RPC when you save.'
        },
        {
            title: 'Enter the L1 contract addresses',
            text: 'Fill in the required fields: Rollup, Bridge, Inbox, Sequencer Inbox and Outbox contract addresses, plus the L1 Gateway Router, L1 ERC20 Gateway, L1 WETH Gateway and L1 Custom Gateway addresses. Optionally add the Challenge Manager, Validator Wallet Creator and Stake Token addresses. Each address must be a valid 0x address of 40 hexadecimal characters.'
        },
        {
            title: 'Enter the L2 gateway addresses',
            text: 'Fill in the four required L2 contract fields: L2 Gateway Router, L2 ERC20 Gateway, L2 WETH Gateway and L2 Custom Gateway.'
        },
        {
            title: 'Review the advanced setting',
            text: 'L1/L2 Message Count Shift is optional. It sets the number of blocks to shift when counting messages. Leave it empty unless you know your chain needs it.'
        },
        {
            title: 'Create the configuration',
            text: 'Click Create Configuration. The button stays disabled until every required field is filled in. A success message, "Orbit configuration created.", confirms it. Later you can edit the values and click Save Configuration.'
        },
        {
            title: 'Check the Orbit features in your explorer',
            text: 'Once the configuration exists, your explorer\'s menu shows Latest L1->L2 Transactions, Latest L2->L1 Transactions and View Batches.'
        }
    ],
    faqs: [
        {
            q: 'Which contract addresses are required for an Orbit explorer?',
            a: 'Thirteen addresses are required: Rollup, Bridge, Inbox, Sequencer Inbox and Outbox, the four L1 gateways (Router, ERC20, WETH, Custom) and the four L2 gateways (Router, ERC20, WETH, Custom). Challenge Manager, Validator Wallet Creator and Stake Token are optional.'
        },
        {
            q: 'What is the difference between the backend RPC and the frontend RPC?',
            a: 'The backend RPC is only used when you create a custom L1 parent: Ethernal\'s servers use it to sync L1 data. The L1 RPC Server (frontend) is required for every Orbit configuration and is exposed to end users for sending withdrawal claim transactions.'
        },
        {
            q: 'Can I change the L1 parent chain later?',
            a: 'No. The L1 Parent Chain selector is disabled once the configuration exists. You can still edit the contract addresses and the other fields.'
        },
        {
            q: 'I get "Our servers can\'t query this RPC". What should I do?',
            a: 'Ethernal validates RPC URLs from its own servers, so each endpoint has to be reachable from the internet. Check for typos and make sure it is not on a private network or a localhost address. If you create a custom L1 with a name that already exists, you will be asked to pick a different name.'
        },
        {
            q: 'Is Orbit tracking available on the free plan?',
            a: 'The plan cards list L2 bridge support under the Team plan ($150/month) and the plans above it, and do not list it for Starter. Check the pricing page for the current plan details.'
        }
    ],
    related: [
        { to: '/arbitrum-orbit', icon: 'mdi-orbit-variant', title: 'Block Explorer for Arbitrum Orbit Chains', desc: 'What Ethernal tracks on Orbit chains' },
        { to: '/guides/create-block-explorer', icon: 'mdi-book-open-variant', title: 'How to Create a Block Explorer', desc: 'The sign-up and explorer setup flow' },
        { to: '/guides/op-stack-block-explorer', icon: 'mdi-layers-outline', title: 'Block Explorer for an OP Stack Chain', desc: 'The equivalent setup for OP Stack chains' },
        { to: '/pricing', icon: 'mdi-tag-outline', title: 'Pricing', desc: 'Starter (free), Team ($150/mo), App Chain ($500/mo), Enterprise' }
    ],
    cta: { label: 'Create your explorer' }
};
</script>

<style scoped>
.orbit-note { color: var(--text-secondary); font-size: 0.93rem; line-height: 1.7; max-width: 760px; margin: 24px 0 0; }
.orbit-link { color: #5DAAE0; text-decoration: underline; text-underline-offset: 3px; }
.orbit-link:hover { color: #8BC4E8; }
</style>
