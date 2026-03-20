<template>
    <footer :style="{ borderTop: '1px solid var(--border-subtle)', background: 'var(--footer-bg)' }">
        <v-container style="max-width: 1200px;" class="py-16">
            <!-- Row 1: Brand + Product/Integrations/Use Cases/Resources -->
            <v-row>
                <v-col cols="12" md="4" lg="3">
                    <router-link to="/" class="d-inline-block text-decoration-none mb-4">
                        <span class="font-heading" :style="{ fontSize: '1.3rem', fontWeight: 600, color: 'var(--text-primary)' }">Ethernal</span>
                    </router-link>
                    <p :style="{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.65, maxWidth: '260px' }">
                        Open-source block explorer for any EVM chain. Built for developers, by developers.
                    </p>
                </v-col>

                <v-col cols="6" sm="3" md="2" lg="2">
                    <div class="footer-heading">Product</div>
                    <div class="d-flex flex-column ga-2">
                        <router-link to="/features" class="footer-link">Features</router-link>
                        <router-link to="/pricing" class="footer-link">Pricing</router-link>
                        <router-link to="/transaction-tracing" class="footer-link">Transaction Tracing</router-link>
                        <a href="https://doc.tryethernal.com" target="_blank" rel="noopener noreferrer" class="footer-link">Docs</a>
                        <a href="/auth" class="footer-link">Sign in</a>
                    </div>
                </v-col>

                <v-col cols="6" sm="3" md="2" lg="2">
                    <div class="footer-heading">Integrations</div>
                    <div class="d-flex flex-column ga-2">
                        <router-link to="/hardhat-block-explorer" class="footer-link">Hardhat</router-link>
                        <router-link to="/anvil-block-explorer" class="footer-link">Anvil</router-link>
                        <router-link to="/ganache-block-explorer" class="footer-link">Ganache</router-link>
                        <router-link to="/kaleido" class="footer-link">Kaleido</router-link>
                        <router-link to="/chainstack" class="footer-link">Chainstack</router-link>
                        <router-link to="/github-actions" class="footer-link">GitHub Actions</router-link>
                    </div>
                </v-col>

                <v-col cols="6" sm="3" md="2" lg="2">
                    <div class="footer-heading">Use Cases</div>
                    <div class="d-flex flex-column ga-2">
                        <router-link to="/developers" class="footer-link">Developers</router-link>
                        <router-link to="/teams" class="footer-link">Teams</router-link>
                        <router-link to="/app-chains" class="footer-link">App Chains</router-link>
                    </div>
                </v-col>

                <v-col cols="6" sm="3" md="2" lg="3">
                    <div class="footer-heading">Resources</div>
                    <div class="d-flex flex-column ga-2">
                        <a href="https://github.com/tryethernal/ethernal" target="_blank" rel="noopener noreferrer" class="footer-link">GitHub</a>
                        <a href="https://discord.gg/jYCER6Mh" target="_blank" rel="noopener noreferrer" class="footer-link">Discord</a>
                        <a href="/blog" class="footer-link">Blog</a>
                        <router-link to="/contact-us" class="footer-link">Contact</router-link>
                    </div>
                </v-col>
            </v-row>

            <!-- Row 2: Frameworks (under Product) + Chains split across Integrations & Use Cases columns -->
            <v-row class="mt-10">
                <v-col cols="12" md="4" lg="3" class="d-none d-md-block">
                    <!-- spacer: aligns with Brand -->
                </v-col>

                <v-col cols="6" sm="3" md="2" lg="2">
                    <div class="footer-heading">Frameworks</div>
                    <div class="d-flex flex-column ga-2">
                        <router-link to="/op-stack" class="footer-link">OP Stack Chains</router-link>
                        <router-link to="/arbitrum-orbit" class="footer-link">Arbitrum Orbit Chains</router-link>
                    </div>
                </v-col>

                <v-col cols="6" sm="3" md="2" lg="2">
                    <div class="footer-heading">Chains</div>
                    <div class="d-flex flex-column ga-2">
                        <router-link to="/chains/ethereum" class="footer-link">Ethereum</router-link>
                        <router-link to="/chains/bnb-chain" class="footer-link">BNB Chain</router-link>
                        <router-link to="/chains/polygon-pos" class="footer-link">Polygon PoS</router-link>
                        <router-link to="/chains/arbitrum-one" class="footer-link">Arbitrum One</router-link>
                        <router-link to="/chains/base" class="footer-link">Base</router-link>
                        <router-link to="/chains/optimism" class="footer-link">Optimism</router-link>
                        <router-link to="/chains/blast" class="footer-link">Blast</router-link>
                        <router-link to="/chains/mode" class="footer-link">Mode</router-link>
                        <router-link to="/chains/zora" class="footer-link">Zora</router-link>
                        <router-link to="/chains/arbitrum-nova" class="footer-link">Arbitrum Nova</router-link>
                    </div>
                </v-col>

                <v-col cols="6" sm="3" md="2" lg="2">
                    <div class="footer-heading">&nbsp;</div>
                    <div class="d-flex flex-column ga-2">
                        <router-link to="/chains/lisk" class="footer-link">Lisk</router-link>
                        <router-link to="/chains/degen-chain" class="footer-link">Degen Chain</router-link>
                        <router-link to="/chains/xai" class="footer-link">Xai</router-link>
                        <router-link to="/chains/cyber" class="footer-link">Cyber</router-link>
                        <router-link to="/chains/redstone" class="footer-link">Redstone</router-link>
                        <router-link to="/chains/mint" class="footer-link">Mint</router-link>
                        <router-link to="/chains/proof-of-play-apex" class="footer-link">Proof of Play</router-link>
                        <router-link to="/chains/sepolia" class="footer-link">Sepolia</router-link>
                        <router-link to="/chains/holesky" class="footer-link">Holesky</router-link>
                        <router-link to="/chains/base-sepolia" class="footer-link">Base Sepolia</router-link>
                        <router-link to="/chains/arbitrum-sepolia" class="footer-link">Arbitrum Sepolia</router-link>
                    </div>
                </v-col>
            </v-row>

            <!-- Copyright bar -->
            <div class="gradient-divider my-8"></div>

            <div class="d-flex flex-wrap align-center justify-space-between">
                <div :style="{ color: 'var(--footer-copyright)', fontSize: '13px' }">
                    &copy; {{ new Date().getFullYear() }} Ethernal. All rights reserved.
                </div>
                <div class="d-flex align-center" :style="{ gap: '16px' }">
                    <router-link to="/terms" class="footer-legal-link">Terms</router-link>
                    <router-link to="/privacy" class="footer-legal-link">Privacy</router-link>
                    <span :style="{ color: 'var(--footer-copyright)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }">
                        Made with care in France
                        <span style="font-size: 14px;">🍷</span>
                    </span>
                </div>
            </div>
        </v-container>
    </footer>
</template>

<script setup>
</script>

<style scoped>
.footer-heading {
    color: var(--text-muted);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-bottom: 14px;
}

.footer-link {
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 14px;
    transition: color 0.2s;
}
.footer-link:hover {
    color: var(--text-primary);
}

.footer-chains-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px 0;
}

.footer-legal-link {
    color: var(--footer-copyright);
    text-decoration: none;
    font-size: 13px;
    transition: color 0.2s;
}
.footer-legal-link:hover {
    color: var(--text-secondary);
}

@media (max-width: 600px) {
    .footer-chains-grid {
        grid-template-columns: 1fr 1fr;
    }
}
</style>
