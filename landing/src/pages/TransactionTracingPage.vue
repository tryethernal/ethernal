<template>
    <LandingLayout>
        <div class="page-hero">
            <v-container style="max-width: 1200px;">
                <div class="text-overline mb-2" style="letter-spacing: 0.1em; color: #5DAAE0;">FEATURE</div>
                <h1 class="font-heading text-white mb-3" style="font-weight: 700; font-size: clamp(1.8rem, 4vw, 2.8rem); letter-spacing: -0.02em;">Transaction Tracing</h1>
                <p class="text-body-1" style="color: var(--text-secondary); max-width: 550px; margin: 0 auto;">
                    Debug any transaction with full call traces, state diffs, and decoded parameters. Understand exactly what happened on-chain.
                </p>
            </v-container>
        </div>

        <section class="landing-section">
            <v-container style="max-width: 1200px;">
                <FeatureSection
                    icon="mdi-file-tree"
                    title="Full Call Tree Visualization"
                    description="See every internal call, delegate call, and static call in a nested tree view. Each node shows the contract, function name, decoded parameters, return value, and gas used."
                />
                <FeatureSection
                    icon="mdi-alert-circle"
                    title="Instant Revert Debugging"
                    description="When a transaction fails, Ethernal highlights the exact call that reverted and shows the revert reason. No more binary search through your code — see the problem immediately."
                    :reverse="true"
                />
                <FeatureSection
                    icon="mdi-delta"
                    title="State Diffs"
                    description="View storage slot changes for every contract touched by a transaction. See before/after values to understand exactly how on-chain state was modified."
                />
                <FeatureSection
                    icon="mdi-code-json"
                    title="Decoded Parameters"
                    description="Function inputs and return values are automatically decoded using verified contract ABIs. See human-readable parameter names, types, and values instead of raw calldata."
                    :reverse="true"
                />
                <FeatureSection
                    icon="mdi-server"
                    title="Compatible with Any Node"
                    description="Works with any node that supports debug_traceTransaction — Hardhat, Anvil, Geth, Erigon, and more. No special configuration needed."
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
