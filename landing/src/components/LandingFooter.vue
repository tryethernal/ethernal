<template>
    <footer style="border-top: 1px solid rgba(61,149,206,0.08); background: #0B1120;">
        <v-container style="max-width: 1200px;" class="py-16">
            <v-row>
                <!-- Brand column -->
                <v-col cols="12" md="4" lg="3">
                    <router-link to="/" class="d-inline-block text-decoration-none mb-4">
                        <span class="font-heading" style="font-size: 1.3rem; font-weight: 600; color: #F1F5F9;">Ethernal</span>
                    </router-link>
                    <p style="color: #64748B; font-size: 14px; line-height: 1.65; max-width: 260px;">
                        Open-source block explorer for any EVM chain. Built for developers, by developers.
                    </p>
                </v-col>

                <v-col cols="6" sm="6" md="2" lg="2">
                    <div class="footer-heading">Product</div>
                    <div class="d-flex flex-column ga-2">
                        <router-link to="/transaction-tracing" class="footer-link">Transaction Tracing</router-link>
                        <router-link to="/pricing" class="footer-link">Pricing</router-link>
                        <a href="https://doc.tryethernal.com" target="_blank" class="footer-link">Docs</a>
                    </div>
                </v-col>

                <v-col cols="6" sm="6" md="2" lg="2">
                    <div class="footer-heading">Use Cases</div>
                    <div class="d-flex flex-column ga-2">
                        <router-link to="/developers" class="footer-link">Developers</router-link>
                        <router-link to="/teams" class="footer-link">Teams</router-link>
                        <router-link to="/app-chains" class="footer-link">App Chains</router-link>
                    </div>
                </v-col>

                <v-col cols="6" sm="6" md="2" lg="2">
                    <div class="footer-heading">Integrations</div>
                    <div class="d-flex flex-column ga-2">
                        <router-link to="/hardhat-block-explorer" class="footer-link">Hardhat</router-link>
                        <router-link to="/anvil-block-explorer" class="footer-link">Anvil</router-link>
                        <router-link to="/ganache-block-explorer" class="footer-link">Ganache</router-link>
                        <router-link to="/kaleido" class="footer-link">Kaleido</router-link>
                        <router-link to="/chainstack" class="footer-link">Chainstack</router-link>
                        <router-link to="/arbitrum-orbit" class="footer-link">Arbitrum Orbit</router-link>
                        <router-link to="/op-stack" class="footer-link">OP Stack</router-link>
                    </div>
                </v-col>

                <v-col cols="6" sm="6" md="2" lg="3">
                    <div class="footer-heading">Resources</div>
                    <div class="d-flex flex-column ga-2">
                        <a href="https://github.com/tryethernal/ethernal" target="_blank" class="footer-link">GitHub</a>
                        <a href="https://discord.gg/jYCER6Mh" target="_blank" class="footer-link">Discord</a>
                        <a href="https://doc.tryethernal.com" target="_blank" class="footer-link">Documentation</a>
                        <a href="https://blog.tryethernal.com" target="_blank" class="footer-link">Blog</a>
                        <router-link to="/contact-us" class="footer-link">Contact</router-link>
                    </div>

                    <div class="footer-heading mt-6">Legal</div>
                    <div class="d-flex flex-column ga-2">
                        <router-link to="/terms" class="footer-link">Terms of Service</router-link>
                        <router-link to="/privacy" class="footer-link">Privacy Policy</router-link>
                    </div>
                </v-col>
            </v-row>

            <div class="gradient-divider my-8"></div>

            <div class="d-flex flex-wrap align-center justify-space-between">
                <div style="color: #475569; font-size: 13px;">
                    &copy; {{ new Date().getFullYear() }} Ethernal. All rights reserved.
                </div>
                <div class="d-flex align-center" style="color: #475569; font-size: 13px; gap: 4px;">
                    Made with care in France
                    <span style="font-size: 14px;">🍷</span>
                </div>
            </div>
        </v-container>
    </footer>
</template>

<script setup>
</script>

<style scoped>
.footer-heading {
    color: #64748B;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-bottom: 14px;
}

.footer-link {
    color: #94A3B8;
    text-decoration: none;
    font-size: 14px;
    transition: color 0.2s;
}
.footer-link:hover {
    color: #F1F5F9;
}
</style>
