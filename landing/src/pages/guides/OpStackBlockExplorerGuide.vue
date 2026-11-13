<!--
  @fileoverview Guide: how to set up a block explorer for an OP Stack chain.
  @component OpStackBlockExplorerGuide
  Every field name, requirement and default below is traced to src/components/ExplorerOpSettings.vue,
  run/api/explorers.js (opConfig routes), run/models/opChainConfig.js and run/lib/opNetworks.js.
  Rendered by the shared GuideLayout.
-->
<template>
    <GuideLayout :guide="guide">
        <template #extra>
            <p class="op-note">
                New to Ethernal? Start with the
                <router-link to="/guides/create-block-explorer" class="op-link">guide to creating a block explorer</router-link>,
                then come back here. For an overview of what Ethernal tracks on OP Stack chains, see
                <router-link to="/op-stack" class="op-link">Block Explorer for OP Stack Chains</router-link>.
            </p>
        </template>
    </GuideLayout>
</template>

<script setup>
import GuideLayout from '@/components/GuideLayout.vue';

const guide = {
    slug: 'op-stack-block-explorer',
    metaTitle: 'How to Set Up a Block Explorer for an OP Stack Chain',
    metaDescription: 'Set up an Ethernal block explorer for your OP Stack chain: add your RPC, the OptimismPortal and Batch Inbox addresses, and track withdrawals.',
    kicker: 'OP Stack Block Explorer',
    h1: 'How to Set Up a Block Explorer for an OP Stack Chain',
    intro: 'Create an Ethernal explorer from your OP Stack chain\'s RPC URL, then open the OP Stack tab in its settings. Choose the L1 parent chain and enter the OptimismPortal and Batch Inbox addresses. Ethernal then tracks deposits, withdrawals, batches and state outputs between L1 and L2.',
    needs: [
        'An Ethernal explorer for your L2 chain. Creating one needs the chain\'s RPC URL, reachable from the internet.',
        'The L1 OptimismPortal contract address (required).',
        'The L1 Batch Inbox address (required).',
        'Optional, depending on your chain: the L2OutputOracle address (legacy chains without fault proofs), the DisputeGameFactory address (chains with fault proofs) and the SystemConfig address.',
        'An L1 parent chain. Ethereum Mainnet is built in. For any other L1, you create a custom L1 with a name and an RPC URL that is reachable from the internet.'
    ],
    steps: [
        {
            title: 'Create an explorer for your L2',
            text: 'Sign up at app.tryethernal.com, choose Public Block Explorer, and enter your explorer name and the RPC URL of your OP Stack chain. The create-a-block-explorer guide covers this flow screen by screen.'
        },
        {
            title: 'Open the OP Stack tab',
            text: 'Go to your explorer\'s page in the dashboard. Its settings have the tabs General, Faucet, Dex, Orbit Chain and OP Stack. Open OP Stack.'
        },
        {
            title: 'Choose the L1 parent chain',
            text: 'Select the L1 Parent Chain (required). Ethereum Mainnet is preselected when available. To use another L1, choose Custom (Create New), then enter a Custom L1 Name and a Backend RPC Server, which Ethernal uses to sync L1 data. You cannot change the parent chain after the configuration is created.'
        },
        {
            title: 'Enter the L1 contract addresses',
            text: 'Fill in OptimismPortal Address (it handles deposits and withdrawal proofs and finalizations) and Batch Inbox Address (the address that receives batch data, usually 0xff00... followed by the chain ID). Then add the optional ones that apply to your chain: L2OutputOracle for legacy chains without fault proofs, DisputeGameFactory for chains using fault proofs, and SystemConfig. Each address must be a valid 0x address of 40 hexadecimal characters.'
        },
        {
            title: 'Check the L2 contract and advanced settings',
            text: 'The L2ToL1MessagePasser Address defaults to 0x4200000000000000000000000000000000000016, so you only change it if your chain differs. Under Advanced Settings, set Output Version to 0 (Legacy, L2OutputOracle) or 1 (Fault Proofs, DisputeGameFactory) to match your chain. Submission Interval is the number of L2 blocks between output submissions.'
        },
        {
            title: 'Create the configuration',
            text: 'Click Create Configuration. A success message, "OP Stack configuration created.", confirms it. Later you can edit the addresses and click Save Configuration.'
        },
        {
            title: 'Check the L2 features in your explorer',
            text: 'Once the configuration exists, your explorer\'s menu shows OP Deposits (L1 to L2), OP Withdrawals (L2 to L1), OP Batches and State Outputs.'
        }
    ],
    faqs: [
        {
            q: 'Which contract addresses do I need for an OP Stack explorer?',
            a: 'Two are required: the OptimismPortal address and the Batch Inbox address. L2OutputOracle (legacy), DisputeGameFactory (fault proofs) and SystemConfig are optional, and L2ToL1MessagePasser has a default. Both required addresses must be valid 0x addresses.'
        },
        {
            q: 'Which L1 parent chains are supported?',
            a: 'Ethereum Mainnet is the built-in choice. For another L1, such as a private or test L1, choose Custom (Create New) and give it a name and a backend RPC URL.'
        },
        {
            q: 'Can I change the L1 parent chain later?',
            a: 'No. The parent chain is fixed once the configuration is created, and the selector is disabled afterwards. The contract addresses can still be edited.'
        },
        {
            q: 'I get "Our servers can\'t query this RPC". What should I do?',
            a: 'Ethernal validates RPC URLs from its own servers, so the endpoint has to be reachable from the internet. Check for typos and make sure it is not on a private network or a localhost address.'
        },
        {
            q: 'Is OP Stack tracking available on the free plan?',
            a: 'The plan cards list L2 bridge support under the Team plan ($150/month) and the plans above it, and do not list it for Starter. Check the pricing page for the current plan details.'
        }
    ],
    related: [
        { to: '/op-stack', icon: 'mdi-layers-outline', title: 'Block Explorer for OP Stack Chains', desc: 'What Ethernal tracks on OP Stack chains' },
        { to: '/guides/create-block-explorer', icon: 'mdi-book-open-variant', title: 'How to Create a Block Explorer', desc: 'The sign-up and explorer setup flow' },
        { to: '/guides/arbitrum-orbit-block-explorer', icon: 'mdi-orbit-variant', title: 'Block Explorer for an Arbitrum Orbit Chain', desc: 'The equivalent setup for Orbit chains' },
        { to: '/pricing', icon: 'mdi-tag-outline', title: 'Pricing', desc: 'Starter (free), Team ($150/mo), App Chain ($500/mo), Enterprise' }
    ],
    cta: { label: 'Create your explorer' }
};
</script>

<style scoped>
.op-note { color: var(--text-secondary); font-size: 0.93rem; line-height: 1.7; max-width: 760px; margin: 24px 0 0; }
.op-link { color: #5DAAE0; text-decoration: underline; text-underline-offset: 3px; }
.op-link:hover { color: #8BC4E8; }
</style>
