<template>
    <header class="landing-navbar" :class="{ scrolled }">
        <div class="navbar-inner">
            <router-link to="/" class="navbar-logo">
                <span class="font-heading">Ethernal</span>
            </router-link>

            <!-- Desktop nav -->
            <nav class="navbar-links d-none d-md-flex">
                <router-link to="/features" class="nav-link">Features</router-link>

                <v-menu open-on-hover :close-on-content-click="true" :open-delay="0" :close-delay="150">
                    <template v-slot:activator="{ props }">
                        <span class="nav-link" v-bind="props" style="cursor: pointer;">
                            Integrations
                            <v-icon size="16" class="ml-1" style="opacity: 0.5;">mdi-chevron-down</v-icon>
                        </span>
                    </template>
                    <div class="mega-menu">
                        <div class="mega-menu-inner">
                            <div class="mega-col">
                                <div class="mega-col-title">Development Tools</div>
                                <router-link to="/hardhat-block-explorer" class="mega-item">
                                    <v-icon size="20" class="mega-item-icon" style="color: #FBBF24;">mdi-hammer-wrench</v-icon>
                                    <div>
                                        <div class="mega-item-name">Hardhat</div>
                                        <div class="mega-item-desc">Plugin for automatic sync</div>
                                    </div>
                                </router-link>
                                <router-link to="/anvil-block-explorer" class="mega-item">
                                    <v-icon size="20" class="mega-item-icon" style="color: #EF4444;">mdi-anvil</v-icon>
                                    <div>
                                        <div class="mega-item-name">Anvil</div>
                                        <div class="mega-item-desc">Foundry local explorer</div>
                                    </div>
                                </router-link>
                                <router-link to="/ganache-block-explorer" class="mega-item">
                                    <v-icon size="20" class="mega-item-icon" style="color: #8B5CF6;">mdi-cube-outline</v-icon>
                                    <div>
                                        <div class="mega-item-name">Ganache</div>
                                        <div class="mega-item-desc">Truffle development chain</div>
                                    </div>
                                </router-link>
                                <router-link to="/github-actions" class="mega-item">
                                    <v-icon size="20" class="mega-item-icon" :style="{ color: 'var(--text-primary)' }">mdi-github</v-icon>
                                    <div>
                                        <div class="mega-item-name">GitHub Actions</div>
                                        <div class="mega-item-desc">CI/CD pipeline integration</div>
                                    </div>
                                </router-link>
                            </div>
                            <div class="mega-col">
                                <div class="mega-col-title">Infrastructure</div>
                                <router-link to="/kaleido" class="mega-item">
                                    <v-icon size="20" class="mega-item-icon" style="color: #3B82F6;">mdi-cloud</v-icon>
                                    <div>
                                        <div class="mega-item-name">Kaleido</div>
                                        <div class="mega-item-desc">Enterprise blockchain platform</div>
                                    </div>
                                </router-link>
                                <router-link to="/chainstack" class="mega-item">
                                    <v-icon size="20" class="mega-item-icon" style="color: #10B981;">mdi-server</v-icon>
                                    <div>
                                        <div class="mega-item-name">Chainstack</div>
                                        <div class="mega-item-desc">Managed node provider</div>
                                    </div>
                                </router-link>
                            </div>
                            <div class="mega-col">
                                <div class="mega-col-title">Popular Chains</div>
                                <router-link to="/chains/ethereum" class="mega-item">
                                    <v-icon size="20" class="mega-item-icon" style="color: #627EEA;">mdi-ethereum</v-icon>
                                    <div>
                                        <div class="mega-item-name">Ethereum</div>
                                        <div class="mega-item-desc">Ethereum mainnet (L1)</div>
                                    </div>
                                </router-link>
                                <router-link to="/chains/bnb-chain" class="mega-item">
                                    <v-icon size="20" class="mega-item-icon" style="color: #F3BA2F;">mdi-alpha-b-circle</v-icon>
                                    <div>
                                        <div class="mega-item-name">BNB Chain</div>
                                        <div class="mega-item-desc">BNB Smart Chain (L1)</div>
                                    </div>
                                </router-link>
                                <router-link to="/chains/polygon-pos" class="mega-item">
                                    <v-icon size="20" class="mega-item-icon" style="color: #8247E5;">mdi-hexagon-outline</v-icon>
                                    <div>
                                        <div class="mega-item-name">Polygon PoS</div>
                                        <div class="mega-item-desc">High-throughput PoS sidechain</div>
                                    </div>
                                </router-link>
                                <router-link to="/chains/arbitrum-one" class="mega-item">
                                    <v-icon size="20" class="mega-item-icon" style="color: #5DAAE0;">mdi-alpha-a-circle</v-icon>
                                    <div>
                                        <div class="mega-item-name">Arbitrum One</div>
                                        <div class="mega-item-desc">Nitro optimistic rollup</div>
                                    </div>
                                </router-link>
                                <router-link to="/chains/base" class="mega-item">
                                    <v-icon size="20" class="mega-item-icon" style="color: #3B82F6;">mdi-alpha-b-circle</v-icon>
                                    <div>
                                        <div class="mega-item-name">Base</div>
                                        <div class="mega-item-desc">Coinbase L2 (OP Stack)</div>
                                    </div>
                                </router-link>
                            </div>
                            <div class="mega-col">
                                <div class="mega-col-title">Browse All</div>
                                <router-link to="/op-stack" class="mega-item">
                                    <v-icon size="20" class="mega-item-icon" style="color: #EF4444;">mdi-layers-triple</v-icon>
                                    <div>
                                        <div class="mega-item-name">OP Stack Chains</div>
                                        <div class="mega-item-desc">Base, Optimism, Blast, Mode, +5 more</div>
                                    </div>
                                </router-link>
                                <router-link to="/arbitrum-orbit" class="mega-item">
                                    <v-icon size="20" class="mega-item-icon" style="color: #28A0F0;">mdi-transit-connection-variant</v-icon>
                                    <div>
                                        <div class="mega-item-name">Orbit Chains</div>
                                        <div class="mega-item-desc">Arbitrum One, Nova, Xai, Degen, +1 more</div>
                                    </div>
                                </router-link>
                            </div>
                        </div>
                    </div>
                </v-menu>

                <v-menu open-on-hover :close-on-content-click="true" :open-delay="0" :close-delay="150">
                    <template v-slot:activator="{ props }">
                        <span class="nav-link" v-bind="props" style="cursor: pointer;">
                            Use Cases
                            <v-icon size="16" class="ml-1" style="opacity: 0.5;">mdi-chevron-down</v-icon>
                        </span>
                    </template>
                    <div class="mega-menu">
                        <div class="mega-menu-inner">
                            <div class="mega-col">
                                <router-link to="/developers" class="mega-item">
                                    <v-icon size="20" class="mega-item-icon" style="color: #FBBF24;">mdi-code-braces</v-icon>
                                    <div>
                                        <div class="mega-item-name">Developers</div>
                                        <div class="mega-item-desc">Debug and explore local chains</div>
                                    </div>
                                </router-link>
                                <router-link to="/teams" class="mega-item">
                                    <v-icon size="20" class="mega-item-icon" style="color: #3D95CE;">mdi-account-group</v-icon>
                                    <div>
                                        <div class="mega-item-name">Teams</div>
                                        <div class="mega-item-desc">Shared testnet explorer</div>
                                    </div>
                                </router-link>
                                <router-link to="/app-chains" class="mega-item">
                                    <v-icon size="20" class="mega-item-icon" style="color: #10B981;">mdi-link-variant</v-icon>
                                    <div>
                                        <div class="mega-item-name">App Chains</div>
                                        <div class="mega-item-desc">White-label for L1s and L2s</div>
                                    </div>
                                </router-link>
                            </div>
                        </div>
                    </div>
                </v-menu>

                <router-link to="/pricing" class="nav-link">Pricing</router-link>
                <a href="/blog" class="nav-link">Blog</a>
                <router-link to="/contact-us" class="nav-link">Contact</router-link>
            </nav>

            <!-- Desktop CTAs -->
            <div class="navbar-actions d-none d-md-flex">
                <a href="https://github.com/tryethernal/ethernal" target="_blank" rel="noopener noreferrer" class="nav-link github-link" aria-label="GitHub">
                    <svg fill="currentColor" height="20" width="20" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
                        <path d="M208.31,75.68A59.78,59.78,0,0,0,202.93,28,8,8,0,0,0,196,24a59.75,59.75,0,0,0-48,24H124A59.75,59.75,0,0,0,76,24a8,8,0,0,0-6.93,4,59.78,59.78,0,0,0-5.38,47.68A58.14,58.14,0,0,0,56,104v8a56.06,56.06,0,0,0,48.44,55.47A39.8,39.8,0,0,0,96,192v8H72a24,24,0,0,1-24-24A40,40,0,0,0,8,136a8,8,0,0,0,0,16,24,24,0,0,1,24,24,40,40,0,0,0,40,40H96v16a8,8,0,0,0,16,0V192a24,24,0,0,1,48,0v40a8,8,0,0,0,16,0V192a39.8,39.8,0,0,0-8.44-24.53A56.06,56.06,0,0,0,216,112v-8A58.14,58.14,0,0,0,208.31,75.68ZM200,112a40,40,0,0,1-40,40H112a40,40,0,0,1-40-40v-8a41.74,41.74,0,0,1,6.9-22.48A8,8,0,0,0,80,73.83a43.81,43.81,0,0,1,.79-33.58,43.88,43.88,0,0,1,32.32,20.06A8,8,0,0,0,119.82,64h32.35a8,8,0,0,0,6.74-3.69,43.87,43.87,0,0,1,32.32-20.06A43.81,43.81,0,0,1,192,73.83a8.09,8.09,0,0,0,1,7.65A41.72,41.72,0,0,1,200,104Z"/>
                    </svg>
                </a>
                <a href="/auth" class="navbar-signin">Sign in</a>
                <a href="/auth?flow=public" class="navbar-cta" @click="trackCta">Get Started</a>
            </div>

            <!-- Mobile hamburger -->
            <button class="navbar-hamburger d-md-none" @click="drawer = !drawer">
                <v-icon :color="hamburgerColor" size="24">mdi-menu</v-icon>
            </button>
        </div>
    </header>

    <!-- Mobile drawer -->
    <v-navigation-drawer v-model="drawer" temporary location="right" :color="drawerBg" width="280">
        <v-list nav class="pa-4">
            <v-list-item to="/features" title="Features" @click="drawer = false" />

            <v-divider class="my-3" :style="{ borderColor: 'var(--drawer-divider)' }" />

            <v-list-subheader :style="{ color: 'var(--drawer-subheader)' }">Integrations</v-list-subheader>
            <v-list-item to="/hardhat-block-explorer" title="Hardhat" @click="drawer = false" prepend-icon="mdi-hammer-wrench" />
            <v-list-item to="/anvil-block-explorer" title="Anvil" @click="drawer = false" prepend-icon="mdi-anvil" />
            <v-list-item to="/ganache-block-explorer" title="Ganache" @click="drawer = false" prepend-icon="mdi-cube-outline" />
            <v-list-item to="/github-actions" title="GitHub Actions" @click="drawer = false" prepend-icon="mdi-github" />
            <v-list-item to="/kaleido" title="Kaleido" @click="drawer = false" prepend-icon="mdi-cloud" />
            <v-list-item to="/chainstack" title="Chainstack" @click="drawer = false" prepend-icon="mdi-server" />

            <v-divider class="my-3" :style="{ borderColor: 'var(--drawer-divider)' }" />

            <v-list-subheader :style="{ color: 'var(--drawer-subheader)' }">Chains</v-list-subheader>
            <v-list-item to="/chains/ethereum" title="Ethereum" @click="drawer = false" prepend-icon="mdi-ethereum" />
            <v-list-item to="/chains/bnb-chain" title="BNB Chain" @click="drawer = false" prepend-icon="mdi-alpha-b-circle" />
            <v-list-item to="/chains/polygon-pos" title="Polygon PoS" @click="drawer = false" prepend-icon="mdi-hexagon-outline" />
            <v-list-item to="/chains/arbitrum-one" title="Arbitrum One" @click="drawer = false" prepend-icon="mdi-alpha-a-circle" />
            <v-list-item to="/chains/base" title="Base" @click="drawer = false" prepend-icon="mdi-alpha-b-circle" />
            <v-list-item to="/op-stack" title="All OP Stack Chains" @click="drawer = false" prepend-icon="mdi-layers-triple" />
            <v-list-item to="/arbitrum-orbit" title="All Orbit Chains" @click="drawer = false" prepend-icon="mdi-transit-connection-variant" />

            <v-divider class="my-3" :style="{ borderColor: 'var(--drawer-divider)' }" />

            <v-list-subheader :style="{ color: 'var(--drawer-subheader)' }">Use Cases</v-list-subheader>
            <v-list-item to="/developers" title="Developers" @click="drawer = false" prepend-icon="mdi-code-braces" />
            <v-list-item to="/teams" title="Teams" @click="drawer = false" prepend-icon="mdi-account-group" />
            <v-list-item to="/app-chains" title="App Chains" @click="drawer = false" prepend-icon="mdi-link-variant" />

            <v-divider class="my-3" :style="{ borderColor: 'var(--drawer-divider)' }" />

            <v-list-item to="/pricing" title="Pricing" @click="drawer = false" />
            <v-list-item href="/blog" title="Blog" @click="drawer = false" />
            <v-list-item to="/contact-us" title="Contact" @click="drawer = false" />

            <v-divider class="my-3" :style="{ borderColor: 'var(--drawer-divider)' }" />

            <div class="pa-2 d-flex flex-column ga-2">
                <v-btn block variant="outlined" color="white" href="/auth" rounded="lg" class="btn-signin">Sign in</v-btn>
                <v-btn block class="btn-primary" href="/auth?flow=public" rounded="lg">Get Started</v-btn>
            </div>
        </v-list>
    </v-navigation-drawer>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const scrolled = ref(false);
const drawer = ref(false);
const hamburgerColor = 'white';
const drawerBg = '#111827';

function onScroll() {
    scrolled.value = window.scrollY > 20;
}

function trackCta() {
    if (window.posthog) window.posthog.capture('landing:cta_click', { cta_type: 'get_started', cta_position: 'navbar' });
}

onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }));
onUnmounted(() => window.removeEventListener('scroll', onScroll));
</script>

<style scoped>
.landing-navbar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    transition: background 0.3s ease, border-color 0.3s ease, backdrop-filter 0.3s ease;
    border-bottom: 1px solid transparent;
}

.landing-navbar.scrolled {
    background: var(--bg-navbar);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-bottom-color: var(--border-subtle);
}

.navbar-inner {
    max-width: 1440px;
    margin: 0 auto;
    padding: 0 32px;
    height: 64px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.navbar-logo {
    text-decoration: none;
    font-size: 1.3rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-right: 32px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    letter-spacing: -0.02em;
}

.navbar-links {
    display: flex;
    align-items: center;
    gap: 4px;
    flex: 1;
}

.nav-link {
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 14px;
    font-weight: 400;
    padding: 6px 12px;
    border-radius: 8px;
    transition: color 0.2s ease, background 0.2s ease;
    display: inline-flex;
    align-items: center;
    cursor: pointer;
}

.nav-link:hover {
    color: var(--text-primary);
    background: var(--nav-hover-bg);
}

.github-link {
    padding: 6px 8px;
}

.theme-toggle {
    background: none;
    border: none;
    padding: 6px 8px;
    cursor: pointer;
}

.navbar-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
}

.navbar-signin {
    color: #94a3b8;
    font-size: 14px;
    font-weight: 500;
    text-decoration: none;
    margin-right: 16px;
    transition: color 0.2s;
}

.navbar-signin:hover {
    color: #fff;
}

.btn-signin {
    text-transform: none;
    font-weight: 600;
    letter-spacing: 0;
    border-color: rgba(255, 255, 255, 0.2) !important;
}

.navbar-cta {
    display: inline-flex;
    align-items: center;
    padding: 8px 20px;
    border-radius: 100px;
    background: linear-gradient(90deg, #3D95CE, #5DAAE0);
    color: white;
    font-size: 14px;
    font-weight: 600;
    text-decoration: none;
    transition: box-shadow 0.3s ease, opacity 0.2s ease;
}

.navbar-cta:hover {
    box-shadow: 0 4px 16px rgba(61, 149, 206, 0.4);
    opacity: 0.92;
}

.navbar-hamburger {
    background: none;
    border: none;
    padding: 8px;
    cursor: pointer;
    margin-left: auto;
}

/* Mega menu */
.mega-menu {
    background: var(--mega-bg);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--mega-border);
    border-radius: 16px;
    box-shadow: var(--mega-shadow);
    padding: 8px;
    margin-top: 4px;
}

.mega-menu-inner {
    display: flex;
    gap: 0;
}

.mega-col {
    padding: 16px 20px;
    min-width: 220px;
}

.mega-col + .mega-col {
    border-left: 1px solid var(--mega-col-border);
}

.mega-col-title {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--mega-col-title);
    padding: 0 10px;
    margin-bottom: 8px;
}

.mega-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 10px;
    border-radius: 10px;
    text-decoration: none;
    transition: background 0.15s ease;
}

.mega-item:hover {
    background: var(--mega-item-hover);
}

.mega-item-icon {
    flex-shrink: 0;
    margin-top: 1px;
}

.mega-item-name {
    color: var(--mega-item-name);
    font-size: 13px;
    font-weight: 500;
    line-height: 1.3;
}

.mega-item-desc {
    color: var(--mega-item-desc);
    font-size: 11px;
    line-height: 1.4;
    margin-top: 2px;
}
</style>
