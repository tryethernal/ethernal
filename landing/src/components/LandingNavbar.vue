<template>
    <header class="landing-navbar" :class="{ scrolled }">
        <div class="navbar-inner">
            <router-link to="/" class="navbar-logo">
                <span class="font-heading">Ethernal</span>
            </router-link>

            <!-- Desktop nav -->
            <nav class="navbar-links d-none d-md-flex">
                <router-link to="/features" class="nav-link">Features</router-link>
                <router-link to="/pricing" class="nav-link">Pricing</router-link>
                <a href="https://doc.tryethernal.com" target="_blank" rel="noopener noreferrer" class="nav-link">Docs</a>
                <router-link to="/contact-us" class="nav-link">Contact</router-link>

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
                                    <v-icon size="20" class="mega-item-icon" style="color: #F1F5F9;">mdi-github</v-icon>
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
                                <div class="mega-col-title">L2 Rollups</div>
                                <router-link to="/arbitrum-orbit" class="mega-item">
                                    <v-icon size="20" class="mega-item-icon" style="color: #3D95CE;">mdi-transit-connection-variant</v-icon>
                                    <div>
                                        <div class="mega-item-name">Arbitrum Orbit</div>
                                        <div class="mega-item-desc">Bridge deposits & withdrawals</div>
                                    </div>
                                </router-link>
                                <router-link to="/op-stack" class="mega-item">
                                    <v-icon size="20" class="mega-item-icon" style="color: #EF4444;">mdi-layers-triple</v-icon>
                                    <div>
                                        <div class="mega-item-name">OP Stack</div>
                                        <div class="mega-item-desc">Optimistic rollup monitoring</div>
                                    </div>
                                </router-link>
                            </div>
                        </div>
                    </div>
                </v-menu>
            </nav>

            <!-- Desktop CTAs -->
            <div class="navbar-actions d-none d-md-flex">
                <a href="https://github.com/tryethernal/ethernal" target="_blank" rel="noopener noreferrer" class="nav-link github-link" aria-label="GitHub">
                    <svg fill="currentColor" height="20" width="20" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
                        <path d="M208.31,75.68A59.78,59.78,0,0,0,202.93,28,8,8,0,0,0,196,24a59.75,59.75,0,0,0-48,24H124A59.75,59.75,0,0,0,76,24a8,8,0,0,0-6.93,4,59.78,59.78,0,0,0-5.38,47.68A58.14,58.14,0,0,0,56,104v8a56.06,56.06,0,0,0,48.44,55.47A39.8,39.8,0,0,0,96,192v8H72a24,24,0,0,1-24-24A40,40,0,0,0,8,136a8,8,0,0,0,0,16,24,24,0,0,1,24,24,40,40,0,0,0,40,40H96v16a8,8,0,0,0,16,0V192a24,24,0,0,1,48,0v40a8,8,0,0,0,16,0V192a39.8,39.8,0,0,0-8.44-24.53A56.06,56.06,0,0,0,216,112v-8A58.14,58.14,0,0,0,208.31,75.68ZM200,112a40,40,0,0,1-40,40H112a40,40,0,0,1-40-40v-8a41.74,41.74,0,0,1,6.9-22.48A8,8,0,0,0,80,73.83a43.81,43.81,0,0,1,.79-33.58,43.88,43.88,0,0,1,32.32,20.06A8,8,0,0,0,119.82,64h32.35a8,8,0,0,0,6.74-3.69,43.87,43.87,0,0,1,32.32-20.06A43.81,43.81,0,0,1,192,73.83a8.09,8.09,0,0,0,1,7.65A41.72,41.72,0,0,1,200,104Z"/>
                    </svg>
                </a>
                <a href="https://app.tryethernal.com/auth" class="nav-link" style="font-weight: 500;">Log in</a>
                <a href="https://app.tryethernal.com/auth" class="navbar-cta">Get Started</a>
            </div>

            <!-- Mobile hamburger -->
            <button class="navbar-hamburger d-md-none" @click="drawer = !drawer">
                <v-icon color="white" size="24">mdi-menu</v-icon>
            </button>
        </div>
    </header>

    <!-- Mobile drawer -->
    <v-navigation-drawer v-model="drawer" temporary location="right" color="#111827" width="280">
        <v-list nav class="pa-4">
            <v-list-item to="/features" title="Features" @click="drawer = false" />
            <v-list-item to="/pricing" title="Pricing" @click="drawer = false" />
            <v-list-item href="https://doc.tryethernal.com" target="_blank" rel="noopener noreferrer" title="Docs" @click="drawer = false" />
            <v-list-item to="/contact-us" title="Contact" @click="drawer = false" />

            <v-divider class="my-3" style="border-color: rgba(61,149,206,0.08);" />

            <v-list-subheader style="color: #64748B;">Development Tools</v-list-subheader>
            <v-list-item to="/hardhat-block-explorer" title="Hardhat" @click="drawer = false" prepend-icon="mdi-hammer-wrench" />
            <v-list-item to="/anvil-block-explorer" title="Anvil" @click="drawer = false" prepend-icon="mdi-anvil" />
            <v-list-item to="/ganache-block-explorer" title="Ganache" @click="drawer = false" prepend-icon="mdi-cube-outline" />
            <v-list-item to="/github-actions" title="GitHub Actions" @click="drawer = false" prepend-icon="mdi-github" />

            <v-list-subheader style="color: #64748B;">Infrastructure</v-list-subheader>
            <v-list-item to="/kaleido" title="Kaleido" @click="drawer = false" prepend-icon="mdi-cloud" />
            <v-list-item to="/chainstack" title="Chainstack" @click="drawer = false" prepend-icon="mdi-server" />

            <v-list-subheader style="color: #64748B;">L2 Rollups</v-list-subheader>
            <v-list-item to="/arbitrum-orbit" title="Arbitrum Orbit" @click="drawer = false" prepend-icon="mdi-transit-connection-variant" />
            <v-list-item to="/op-stack" title="OP Stack" @click="drawer = false" prepend-icon="mdi-layers-triple" />

            <v-divider class="my-3" style="border-color: rgba(61,149,206,0.08);" />

            <v-list-subheader style="color: #64748B;">Use Cases</v-list-subheader>
            <v-list-item to="/features" title="Developers" @click="drawer = false" />
            <v-list-item to="/teams" title="Teams" @click="drawer = false" />
            <v-list-item to="/app-chains" title="App Chains" @click="drawer = false" />

            <v-divider class="my-3" style="border-color: rgba(61,149,206,0.08);" />

            <div class="pa-2 d-flex flex-column ga-2">
                <v-btn block class="btn-outline" href="https://app.tryethernal.com/auth" rounded="lg">Log In</v-btn>
                <v-btn block class="btn-primary" href="https://app.tryethernal.com/auth" rounded="lg">Get Started</v-btn>
            </div>
        </v-list>
    </v-navigation-drawer>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const scrolled = ref(false);
const drawer = ref(false);

function onScroll() {
    scrolled.value = window.scrollY > 20;
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
    background: rgba(11, 17, 32, 0.8);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-bottom-color: rgba(61, 149, 206, 0.08);
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
    color: #F1F5F9;
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
    color: #94A3B8;
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
    color: #F1F5F9;
    background: rgba(255, 255, 255, 0.05);
}

.github-link {
    padding: 6px 8px;
}

.navbar-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
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
    background: rgba(17, 24, 39, 0.95);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(61, 149, 206, 0.18);
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(61, 149, 206, 0.06);
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
    border-left: 1px solid rgba(61, 149, 206, 0.08);
}

.mega-col-title {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #64748B;
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
    background: rgba(61, 149, 206, 0.08);
}

.mega-item-icon {
    flex-shrink: 0;
    margin-top: 1px;
}

.mega-item-name {
    color: #F1F5F9;
    font-size: 13px;
    font-weight: 500;
    line-height: 1.3;
}

.mega-item-desc {
    color: #64748B;
    font-size: 11px;
    line-height: 1.4;
    margin-top: 2px;
}
</style>
