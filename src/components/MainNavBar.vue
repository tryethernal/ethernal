<template>
    <v-app-bar height="64" :style="styles" flat class="main-bar">
        <v-container class="d-flex align-center fill-height">
            <div class="d-flex align-center">
                <div class="custom-logo-wrapper mr-4" v-if="logo">
                    <router-link class="text-decoration-none" :to="'/overview'">
                        <img :src="logo" alt="logo" class="custom-logo" />
                    </router-link>
                </div>
                <div v-else class="text-h6 text-accent">
                    <router-link class="text-decoration-none text-primary" :to="'/overview'">
                        {{ currentWorkspaceStore.name || 'Ethernal' }}
                    </router-link>
                </div>
            </div>

            <v-spacer></v-spacer>

            <div class="d-flex align-center fill-height">
                <v-hover>
                    <template v-slot:default="{ isHovering, props }">
                        <v-btn :color="isHovering || route.path === '/overview' ? 'primary' : 'black'" variant="plain" v-bind="props" :to="'/overview'" :class="`text-default opacity-${isHovering || route.path === '/overview' ? '100' : '80'} fill-height`">Home</v-btn>
                    </template>
                </v-hover>

                <v-menu open-on-hover :open-delay="0" :close-delay="1" :close-on-content-click="true" transition="scroll-y-transition">
                    <template v-slot:activator="{ props, isActive }">
                        <v-btn :color="isActive || isBlockchainActive ? 'primary' : 'black'" variant="plain" v-bind="props" :class="`d-flex align-center opacity-${isActive || isBlockchainActive ? '100' : '80'} fill-height`">
                            Blockchain
                            <v-icon :icon="isActive ? 'mdi-chevron-up' : 'mdi-chevron-down'" class="ml-1"></v-icon>
                        </v-btn>
                    </template>
                    <v-list active-class="router-link-active" border="opacity-100" class="border-t-lg border-primary opacity-100 rounded-t-0">
                        <v-list-item class="mb-2" :to="'/transactions'" title="Transactions">
                            <template v-slot:title>
                                <span class="text-body-2">Transactions</span>
                            </template>
                        </v-list-item>
                        <v-list-item class="mb-2" :to="'/txsInternal'" title="Internal Transactions">
                            <template v-slot:title>
                                <span class="text-body-2">Internal Transactions</span>
                            </template>
                        </v-list-item>
                        <v-divider class="my-2"></v-divider>

                        <v-list-item class="mb-2 text-caption" :to="'/blocks'" title="Blocks">
                            <template v-slot:title>
                                <span class="text-body-2">Blocks</span>
                            </template>
                        </v-list-item>

                        <v-divider class="my-2"></v-divider>

                        <v-list-item class="mb-2 text-caption" :to="'/contractsVerified'" title="Verified Contracts">
                            <template v-slot:title>
                                <span class="text-body-2">Verified Contracts</span>
                            </template>
                        </v-list-item>
                        <v-list-item class="mb-2 text-caption" :to="'/contracts'" title="All Contracts">
                            <template v-slot:title>
                                <span class="text-body-2">All Contracts</span>
                            </template>
                        </v-list-item>
                    </v-list>
                </v-menu>

                <v-menu open-on-hover :open-delay="0" :close-delay="1" :close-on-content-click="true" transition="scroll-y-transition">
                    <template v-slot:activator="{ props, isActive }">
                        <v-btn :color="isActive || isTokensActive ? 'primary' : 'black'" variant="plain" v-bind="props" :class="`d-flex align-center opacity-${isActive || isTokensActive ? '100' : '80'} fill-height`">
                            Tokens
                            <v-icon :icon="isActive ? 'mdi-chevron-up' : 'mdi-chevron-down'" class="ml-1"></v-icon>
                        </v-btn>
                    </template>
                    <v-list active-class="router-link-active" border="opacity-100" class="border-t-lg border-primary opacity-100 rounded-t-0">
                        <v-list-item class="mb-2" :to="'/toptokens'">
                            <template v-slot:title>
                                <span class="text-body-2">Top Tokens</span> <span class="text-caption text-medium-emphasis">(ERC-20)</span>
                            </template>
                        </v-list-item>
                        <v-list-item class="mb-2" :to="'/tokenstxn'">
                            <template v-slot:title>
                                <span class="text-body-2">Token Transfers</span> <span class="text-caption text-medium-emphasis">(ERC-20)</span>
                            </template>
                        </v-list-item>
                        <v-list-item class="mb-2" :to="'/tokens'">
                            <template v-slot:title>
                                <span class="text-body-2">All Tokens</span> <span class="text-caption text-medium-emphasis">(ERC-20)</span>
                            </template>
                        </v-list-item>
                    </v-list>
                </v-menu>

                <v-menu open-on-hover :open-delay="0" :close-delay="1" :close-on-content-click="true" transition="scroll-y-transition">
                    <template v-slot:activator="{ props, isActive }">
                        <v-btn :color="isActive || isNftsActive ? 'primary' : 'black'" variant="plain" v-bind="props" :class="`d-flex align-center opacity-${isActive || isNftsActive ? '100' : '80'} fill-height`">
                            NFTs
                            <v-icon :icon="isActive ? 'mdi-chevron-up' : 'mdi-chevron-down'" class="ml-1"></v-icon>
                        </v-btn>
                    </template>
                    <v-list active-class="router-link-active" border="opacity-100" class="border-t-lg border-primary opacity-100 rounded-t-0">
                        <v-list-item class="mb-2" :to="'/nft-top-contracts'" title="Top NFTs">
                            <template v-slot:title>
                                <span class="text-body-2">Top NFTs</span>
                            </template>
                        </v-list-item>
                        <v-list-item class="mb-2" :to="'/nfts'" title="All NFTs">
                            <template v-slot:title>
                                <span class="text-body-2">All NFTs</span>
                            </template>
                        </v-list-item>
                        <v-list-item class="mb-2" :to="'/nft-top-mints'" title="Top Mints">
                            <template v-slot:title>
                                <span class="text-body-2">Top Mints</span>
                            </template>
                        </v-list-item>
                        <v-list-item class="mb-2" :to="'/nft-transfers'" title="Latest Transfers">
                            <template v-slot:title>
                                <span class="text-body-2">Latest Transfers</span>
                            </template>
                        </v-list-item>
                    </v-list>
                </v-menu>

                <v-menu open-on-hover :open-delay="0" :close-delay="1" :close-on-content-click="true" transition="scroll-y-transition">
                    <template v-slot:activator="{ props, isActive }">
                        <v-btn :color="isActive || isResourcesActive ? 'primary' : 'black'" variant="plain" v-bind="props" :class="`d-flex align-center opacity-${isActive || isResourcesActive ? '100' : '80'} fill-height`">
                            Resources
                            <v-icon :icon="isActive ? 'mdi-chevron-up' : 'mdi-chevron-down'" class="ml-1"></v-icon>
                        </v-btn>
                    </template>
                    <v-list active-class="router-link-active" border="opacity-100" class="border-t-lg border-primary opacity-100 rounded-t-0">
                        <v-list-item class="mb-2" :to="'/analytics'" title="Analytics" density="compact" v-if="currentWorkspaceStore.public">
                            <template v-slot:title>
                                <span class="text-body-2">Analytics</span>
                            </template>
                        </v-list-item>
                        <v-list-item class="mb-2" :to="'/faucet'" title="Faucet" density="compact" v-if="explorerStore.isDemo || explorerStore.faucet || (envStore.isAdmin && currentWorkspaceStore.public)">
                            <template v-slot:title>
                                <span class="text-body-2">Faucet</span>
                            </template>
                        </v-list-item>
                        <v-list-item class="mb-2" :to="'/dex'" title="DEX" density="compact" v-if="explorerStore.isDemo || explorerStore.v2Dex || (envStore.isAdmin && currentWorkspaceStore.public)">
                            <template v-slot:title>
                                <span class="text-body-2">DEX</span>
                            </template>
                        </v-list-item>
                        <v-list-item class="mb-2" :to="'/bridge'" title="Bridge" density="compact" v-if="explorerStore.isDemo || (envStore.isAdmin && currentWorkspaceStore.public)">
                            <template v-slot:title>
                                <span class="text-body-2">Bridge</span>
                            </template>
                        </v-list-item>
                    </v-list>
                </v-menu>

                <v-menu open-on-hover :open-delay="0" :close-delay="1" :close-on-content-click="true" transition="scroll-y-transition" v-if="envStore.isAdmin">
                    <template v-slot:activator="{ props, isActive }">
                        <v-btn :color="isActive || isMoreActive ? 'primary' : 'black'" variant="plain" v-bind="props" :class="`d-flex align-center opacity-${isActive || isMoreActive ? '100' : '80'} fill-height`">
                            More
                            <v-icon :icon="isActive ? 'mdi-chevron-up' : 'mdi-chevron-down'" class="ml-1"></v-icon>
                        </v-btn>
                    </template>
                    <v-list active-class="router-link-active" border="opacity-100" class="border-t-lg border-primary opacity-100 rounded-t-0">
                        <v-list-item class="mb-2" :to="'/explorers'" title="Public Explorers">
                            <template v-slot:title>
                                <span class="text-body-2">Public Explorers</span>
                            </template>
                        </v-list-item>
                        <v-list-item class="mb-2" :to="'/settings?tab=workspace'" title="Settings">
                            <template v-slot:title>
                                <span class="text-body-2">Settings</span>
                            </template>
                        </v-list-item>
                        <v-divider></v-divider>
                        <v-list-item class="mb-2" href="https://doc.tryethernal.com" target="_blank" title="Documentation">
                            <template v-slot:title>
                                <span class="text-body-2">Documentation</span>
                            </template>
                        </v-list-item>
                        <v-list-item class="mb-2" href="https://discord.gg/jEAprf45jj" target="_blank" title="Discord">
                            <template v-slot:title>
                                <span class="text-body-2">Discord</span>
                            </template>
                        </v-list-item>
                        <v-list-item v-show="prAuthToken" :href="`https://ethernal.productroad.com/company/auth/?token=${prAuthToken}`" target="_blank" title="Feature Requests">
                            <template v-slot:title>
                                <span class="text-body-2">Feature Requests</span>
                            </template>
                        </v-list-item>
                    </v-list>
                </v-menu>

                <v-menu open-on-hover :open-delay="0" :close-delay="1" :close-on-content-click="true" transition="scroll-y-transition">
                    <template v-slot:activator="{ props, isActive }">
                        <v-btn :color="isActive ? 'primary' : 'black'" variant="plain" v-bind="props" :class="`d-flex align-center opacity-${isActive ? '100' : '80'} fill-height`">
                            <v-icon :icon="isActive ? 'mdi-dots-horizontal' : 'mdi-dots-vertical'"></v-icon>
                        </v-btn>
                    </template>
                    <v-list active-class="router-link-active" border="opacity-100" class="border-t-lg border-primary opacity-100 rounded-t-0">
                        <v-list-item class="mb-2" prepend-icon="arcticons:metamask" title="Add To Metamask" v-if="ethereum && hasNetworkInfo" @click="addNetworkToMetamask()">
                            <template v-slot:title>
                                <span class="text-body-2">Add To Metamask</span>
                            </template>
                        </v-list-item>
                        <v-list-item class="mb-2" v-for="(link, idx) in links" :prepend-icon="link.icon || 'mdi-open-in-new'" :title="link.name" target="_blank" :href="link.url" :key="idx">
                            <template v-slot:title>
                                <span class="text-body-2">{{ link.name }}</span>
                            </template>
                        </v-list-item>
                        <v-list-item class="text-error-darken-3 mb-2" title="Log Out" @click="logOut()" v-if="userStore.loggedIn">
                            <template v-slot:prepend>
                                <v-icon color="error-darken-3" icon="mdi-logout"></v-icon>
                            </template>
                        </v-list-item>
                    </v-list>
                </v-menu>

                <WalletConnector v-if="currentWorkspaceStore.id" :key="2" />
            </div>
        </v-container>
    </v-app-bar>
</template>

<script setup>
import { computed } from 'vue';
import { useCurrentWorkspaceStore } from '../stores/currentWorkspace';
import { useEnvStore } from '../stores/env';
import { useExplorerStore } from '../stores/explorer';
import { useUserStore } from '../stores/user';
import { useRoute } from 'vue-router';
import WalletConnector from './WalletConnector.vue';
// Props definition
const props = defineProps({
    styles: {
        type: Object,
        default: () => ({})
    },
    logo: {
        type: String,
        default: null
    },
    ethereum: {
        type: Object,
        default: null
    },
    links: {
        type: Array,
        default: () => []
    },
    prAuthToken: {
        type: String,
        default: null
    }
});

// Store initialization
const currentWorkspaceStore = useCurrentWorkspaceStore();
const envStore = useEnvStore();
const explorerStore = useExplorerStore();
const userStore = useUserStore();

// Add route matching computed properties
const route = useRoute();

const isBlockchainActive = computed(() => {
    const blockchainRoutes = ['/transactions', '/pending', '/internal-tx', '/blocks', '/accounts', '/contracts'];
    return blockchainRoutes.includes(route.path);
});

const isTokensActive = computed(() => {
    const tokenRoutes = ['/tokens', '/toptokens', '/tokenstxn'];
    return tokenRoutes.includes(route.path);
});

const isNftsActive = computed(() => {
    const nftRoutes = ['/nfts', '/nft-top-contracts', '/nft-top-mints', '/nft-transfers'];
    return nftRoutes.includes(route.path);
});

const isResourcesActive = computed(() => {
    const resourceRoutes = ['/analytics', '/faucet', '/dex', '/bridge'];
    return resourceRoutes.includes(route.path);
});

const isMoreActive = computed(() => {
    const moreRoutes = ['/explorers', '/settings'];
    return moreRoutes.includes(route.path);
});

// Computed properties
const hasNetworkInfo = computed(() => {
    return !!(explorerStore.name && explorerStore.domain && explorerStore.token && explorerStore.rpcServer);
});

// Methods
const addNetworkToMetamask = () => {
    if (!props.ethereum) return;

    let domain = explorerStore.domain;
    if (explorerStore.domains && explorerStore.domains.length) {
        domain = explorerStore.domains[0].domain;
    }

    props.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
            {
                chainId: `0x${parseInt(currentWorkspaceStore.networkId).toString(16)}`,
                chainName: explorerStore.name,
                rpcUrls: [explorerStore.rpcServer],
                blockExplorerUrls: [`https://${domain}`],
                nativeCurrency: {
                    name: explorerStore.token,
                    symbol: explorerStore.token,
                    decimals: 18
                }
            }
        ]
    }).catch(console.log);
};

const logOut = () => {
    userStore.updateUser(null);
    document.location.reload();
};
</script>

<style>
.v-app-bar {
    background-color: white !important;
}
.v-app-bar.main-bar {
    border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.v-app-bar .v-btn {
    text-transform: none;
    font-weight: 500;
    box-shadow: none !important;
    position: relative;
    transition: none;
    -webkit-tap-highlight-color: transparent;
}

.v-app-bar .v-btn::before,
.v-app-bar .v-btn::after {
    display: none;
}

.v-app-bar .v-btn:active {
    transform: none;
}

.v-app-bar .v-btn:focus {
    outline: none;
}

.v-app-bar .v-btn:focus-visible {
    outline: none;
    box-shadow: none;
}

.v-app-bar .v-btn .v-ripple__container {
    display: none;
}
.v-app-bar .v-btn.text-default {
    color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
}
.v-menu .v-list-item {
    min-height: 32px;
    padding: 0 16px;
    font-size: 0.875rem;
    color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
    margin: 0 8px;
    border-radius: 16px;
    transition: color 0.2s ease;
    background: transparent !important;
}

/* Override ALL Vuetify background styles */
.v-menu .v-list-item,
.v-menu .v-list-item--active,
.v-menu .v-list-item--variant-plain,
.v-menu .v-list-item--variant-text,
.v-menu .v-list-item:hover,
.v-menu .v-list-item:focus,
.v-menu .v-list-item.router-link-active {
    background: none !important;
    background-color: transparent !important;
}

.v-menu .v-list-item:hover,
.v-menu .v-list-item.router-link-active {
    color: rgb(var(--v-theme-primary));
}

/* Remove all pseudo-elements and overlays */
.v-menu .v-list-item::before,
.v-menu .v-list-item::after,
.v-menu .v-list-item > .v-ripple__container,
.v-menu .v-list-item .v-list-item__overlay {
    display: none !important;
    background: none !important;
    opacity: 0 !important;
}

.v-menu .v-list {
    border-radius: 8px;
    box-shadow: rgba(0, 0, 0, 0.1) 0px 0px 5px 0px, rgba(0, 0, 0, 0.1) 0px 0px 1px 0px;
    min-width: 220px;
    padding: 8px 0;
}

.v-menu .v-divider {
    margin: 8px 0;
}

.custom-logo {
    max-height: 40px;
}
</style> 