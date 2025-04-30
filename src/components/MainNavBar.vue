<template>
    <div>
        <!-- Mobile Navigation Drawer -->
        <v-navigation-drawer
            :model-value="drawer"
            @update:model-value="$emit('update:drawer', $event)"
            temporary
            v-if="mobile"
            location="left"
            width="300"
            :class="'theme-background'"
        >
            <v-list>
                <v-list-item>
                    <div class="custom-logo-wrapper mr-4" v-if="logo">
                        <router-link class="text-decoration-none" :to="'/overview'">
                            <img :src="logo" alt="logo" class="custom-logo" />
                        </router-link>
                    </div>
                    <router-link v-else class="text-decoration-none text-h6 text-primary" :to="'/overview'">
                        {{ currentWorkspaceStore.name || 'Ethernal' }}
                    </router-link>
                </v-list-item>

                <v-divider class="ma-2"></v-divider>

                <!-- Blockchain Section -->
                <v-list-group value="blockchain">
                    <template v-slot:activator="{ props }">
                        <v-list-item
                            v-bind="props"
                            :color="isBlockchainActive ? 'primary' : undefined"
                        >
                            <template v-slot:title>
                                <span class="text-body-1">Blockchain</span>
                            </template>
                        </v-list-item>
                    </template>
                    <v-list-item :to="'/transactions'" title="Transactions" :color="route.path === '/transactions' ? 'primary' : undefined">
                        <template v-slot:title>
                            <span class="text-body-2">Transactions</span>
                        </template>
                    </v-list-item>
                    <v-list-item :to="'/txsInternal'" title="Internal Transactions" :color="route.path === '/txsInternal' ? 'primary' : undefined">
                        <template v-slot:title>
                            <span class="text-body-2">Internal Transactions</span>
                        </template>
                    </v-list-item>
                    <v-list-item :to="'/blocks'" title="Blocks" :color="route.path === '/blocks' ? 'primary' : undefined">
                        <template v-slot:title>
                            <span class="text-body-2">Blocks</span>
                        </template>
                    </v-list-item>
                    <v-list-item :to="'/contractsVerified'" title="Verified Contracts" :color="route.path === '/contractsVerified' ? 'primary' : undefined">
                        <template v-slot:title>
                            <span class="text-body-2">Verified Contracts</span>
                        </template>
                    </v-list-item>
                    <v-list-item :to="'/contracts'" title="All Contracts" :color="route.path === '/contracts' ? 'primary' : undefined">
                        <template v-slot:title>
                            <span class="text-body-2">All Contracts</span>
                        </template>
                    </v-list-item>
                </v-list-group>

                <!-- Tokens Section -->
                <v-list-group value="tokens">
                    <template v-slot:activator="{ props }">
                        <v-list-item
                            v-bind="props"
                            :color="isTokensActive ? 'primary' : undefined"
                        >
                            <template v-slot:title>
                                <span class="text-body-1">Tokens</span>
                            </template>
                        </v-list-item>
                    </template>
                    <v-list-subheader class="text-primary text-caption font-weight-medium">ERC-20</v-list-subheader>
                    <v-list-item :to="'/toptokens'" title="Top Tokens" :color="route.path === '/toptokens' ? 'primary' : undefined">
                        <template v-slot:title>
                            <span class="text-body-2">Top Tokens</span>
                        </template>
                    </v-list-item>
                    <v-list-item :to="'/tokens'" title="All Tokens" :color="route.path === '/tokens' ? 'primary' : undefined">
                        <template v-slot:title>
                            <span class="text-body-2">All Tokens</span>
                        </template>
                    </v-list-item>
                    <v-list-item :to="'/tokenstxn'" title="Latest Transfers" :color="route.path === '/tokenstxn' ? 'primary' : undefined">
                        <template v-slot:title>
                            <span class="text-body-2">Latest Transfers</span>
                        </template>
                    </v-list-item>
                    <v-divider class="ma-2"></v-divider>
                    <v-list-subheader class="text-primary text-caption font-weight-medium">NFTs (ERC-721 & ERC-1155)</v-list-subheader>
                    <v-list-item :to="'/nft-top-contracts'" title="Top Tokens" :color="route.path === '/nft-top-contracts' ? 'primary' : undefined">
                        <template v-slot:title>
                            <span class="text-body-2">Top Tokens</span>
                        </template>
                    </v-list-item>
                    <v-list-item :to="'/nfts'" title="All Tokens" :color="route.path === '/nfts' ? 'primary' : undefined">
                        <template v-slot:title>
                            <span class="text-body-2">All Tokens</span>
                        </template>
                    </v-list-item>
                    <v-list-item :to="'/nft-transfers'" title="Latest Transfers" :color="route.path === '/nft-transfers' ? 'primary' : undefined">
                        <template v-slot:title>
                            <span class="text-body-2">Latest Transfers</span>
                        </template>
                    </v-list-item>
                </v-list-group>

                <v-list-item :to="'/analytics'" title="Charts" :color="route.path === '/analytics' ? 'primary' : undefined">
                    <template v-slot:title>
                        <span class="text-body-1">Charts</span>
                    </template>
                </v-list-item>

                <!-- Conditional Items -->
                <v-list-item v-if="explorerStore.isDemo || explorerStore.faucet || (envStore.isAdmin && currentWorkspaceStore.public)" 
                    :to="'/faucet'" title="Faucet" :color="route.path === '/faucet' ? 'primary' : undefined">
                    <template v-slot:title>
                        <span class="text-body-1">Faucet</span>
                    </template>
                </v-list-item>

                <v-list-item v-if="explorerStore.isDemo || explorerStore.v2Dex || (envStore.isAdmin && currentWorkspaceStore.public)"
                    :to="'/dex'" title="DEX" :color="route.path === '/dex' ? 'primary' : undefined">
                    <template v-slot:title>
                        <span class="text-body-1">DEX</span>
                    </template>
                </v-list-item>

                <v-list-item v-if="explorerStore.isDemo || (envStore.isAdmin && currentWorkspaceStore.public)"
                    :to="'/bridge'" title="Bridge" :color="route.path === '/bridge' ? 'primary' : undefined">
                    <template v-slot:title>
                        <span class="text-body-1">Bridge</span>
                    </template>
                </v-list-item>

                <!-- Admin Section -->
                <template v-if="envStore.isAdmin">
                    <v-divider class="ma-2"></v-divider>
                    <v-list-item :to="'/explorers'" title="Public Explorers" :color="route.path === '/explorers' ? 'primary' : undefined">
                        <template v-slot:title>
                            <span class="text-body-1">Public Explorers</span>
                        </template>
                    </v-list-item>
                    <v-list-item :to="'/settings?tab=workspace'" title="Settings" :color="route.path === '/settings' ? 'primary' : undefined">
                        <template v-slot:title>
                            <span class="text-body-1">Settings</span>
                        </template>
                    </v-list-item>
                    <v-list-item @click="logOut" title="Logout">
                        <template v-slot:title>
                            <span class="text-body-1 text-error">Logout</span>
                        </template>
                    </v-list-item>
                </template>
                <v-divider class="ma-2"></v-divider>

                <!-- Wallet Section -->
                <v-list-item>
                    <WalletConnector v-if="currentWorkspaceStore.id" :key="2" />
                </v-list-item>
            </v-list>
        </v-navigation-drawer>

        <!-- Desktop Navigation Bar -->
        <v-app-bar height="64" :style="styles" flat :class="['main-bar', 'theme-background']" v-if="!mobile">
            <v-container class="d-flex align-center fill-height">
                <div class="d-flex align-center">
                    <div class="custom-logo-wrapper mr-4" v-if="logo">
                        <router-link class="text-decoration-none" :to="'/overview'">
                            <img :src="logo" alt="logo" class="custom-logo" />
                        </router-link>
                    </div>
                    <router-link v-else class="text-decoration-none text-h6 text-primary" :to="'/overview'">
                        {{ currentWorkspaceStore.name || 'Ethernal' }}
                    </router-link>
                </div>

                <v-spacer></v-spacer>

                <div class="d-flex align-center fill-height">
                    <v-menu 
                        v-model="blockchainMenuOpen"
                        open-on-hover 
                        :open-delay="0" 
                        :close-delay="100"
                        :close-on-content-click="false"
                        transition="scroll-y-transition"
                    >
                        <template v-slot:activator="{ props, isActive }">
                            <v-btn 
                                :color="isActive || blockchainMenuOpen || isBlockchainActive ? 'primary' : undefined" 
                                variant="plain" 
                                v-bind="props"
                                @mouseleave="blockchainMenuOpen = false"
                                :class="`opacity-100 d-flex align-center fill-height ${isActive || blockchainMenuOpen || isBlockchainActive ? 'text-primary' : 'text-default opacity-80'}`"
                            >
                                Blockchain
                                <v-icon :icon="isActive ? 'mdi-chevron-up' : 'mdi-chevron-down'" class="ml-1"></v-icon>
                            </v-btn>
                        </template>
                        <v-list 
                            active-class="router-link-active" 
                            border="opacity-100" 
                            class="border-t-lg border-primary opacity-100 rounded-t-0"
                            @mouseleave="blockchainMenuOpen = false"
                        >
                            <v-list-item :to="'/transactions'" title="Transactions">
                                <template v-slot:title>
                                    <span class="text-body-2">Transactions</span>
                                </template>
                            </v-list-item>
                            <v-list-item :to="'/txsInternal'" title="Internal Transactions">
                                <template v-slot:title>
                                    <span class="text-body-2">Internal Transactions</span>
                                </template>
                            </v-list-item>
                            <v-divider class="ma-2"></v-divider>

                            <v-list-item :to="'/blocks'" title="Blocks">
                                <template v-slot:title>
                                    <span class="text-body-2">Blocks</span>
                                </template>
                            </v-list-item>

                            <v-divider class="ma-2"></v-divider>

                            <v-list-item :to="'/contractsVerified'" title="Verified Contracts">
                                <template v-slot:title>
                                    <span class="text-body-2">Verified Contracts</span>
                                </template>
                            </v-list-item>
                            <v-list-item :to="'/contracts'" title="All Contracts">
                                <template v-slot:title>
                                    <span class="text-body-2">All Contracts</span>
                                </template>
                            </v-list-item>
                        </v-list>
                    </v-menu>

                    <v-menu 
                        v-model="tokensMenuOpen"
                        open-on-hover 
                        :open-delay="0" 
                        :close-delay="100"
                        :close-on-content-click="false"
                        transition="scroll-y-transition"
                    >
                        <template v-slot:activator="{ props, isActive }">
                            <v-btn 
                                :color="isActive || tokensMenuOpen || isTokensActive ? 'primary' : undefined" 
                                variant="plain" 
                                v-bind="props"
                                @mouseleave="tokensMenuOpen = false"
                                :class="`opacity-100 d-flex align-center fill-height ${isActive || tokensMenuOpen || isTokensActive ? 'text-primary' : 'text-default opacity-80'}`"
                            >
                                Tokens
                                <v-icon :icon="isActive ? 'mdi-chevron-up' : 'mdi-chevron-down'" class="ml-1"></v-icon>
                            </v-btn>
                        </template>
                        <v-list 
                            active-class="router-link-active" 
                            border="opacity-100" 
                            class="border-t-lg border-primary opacity-100 rounded-t-0"
                            @mouseleave="tokensMenuOpen = false"
                        >
                            <v-list-subheader class="text-primary text-caption font-weight-medium">ERC-20</v-list-subheader>
                            <v-list-item :to="'/toptokens'" title="Top Tokens">
                                <template v-slot:title>
                                    <span class="text-body-2">Top Tokens</span>
                                </template>
                            </v-list-item>
                            <v-list-item :to="'/tokens'" title="All Tokens">
                                <template v-slot:title>
                                    <span class="text-body-2">All Tokens</span>
                                </template>
                            </v-list-item>
                            <v-list-item :to="'/tokenstxn'" title="Latest Transfers">
                                <template v-slot:title>
                                    <span class="text-body-2">Latest Transfers</span>
                                </template>
                            </v-list-item>

                            <v-divider class="ma-2"></v-divider>

                            <v-list-subheader class="text-primary text-caption font-weight-medium">NFTs (ERC-721 & ERC-1155)</v-list-subheader>
                            <v-list-item :to="'/nft-top-contracts'" title="Top Tokens">
                                <template v-slot:title>
                                    <span class="text-body-2">Top Tokens</span>
                                </template>
                            </v-list-item>
                            <v-list-item :to="'/nfts'" title="All Tokens">
                                <template v-slot:title>
                                    <span class="text-body-2">All Tokens</span>
                                </template>
                            </v-list-item>
                            <v-list-item :to="'/nft-transfers'" title="Latest Transfers">
                                <template v-slot:title>
                                    <span class="text-body-2">Latest Transfers</span>
                                </template>
                            </v-list-item>
                        </v-list>
                    </v-menu>

                    <v-hover>
                        <template v-slot:default="{ isHovering, props }">
                            <v-btn 
                                :color="isHovering || route.path === '/analytics' ? 'primary' : undefined" 
                                variant="plain" 
                                v-bind="props" 
                                :to="'/analytics'" 
                                :class="`opacity-100 d-flex align-center fill-height ${isHovering || route.path === '/analytics' ? 'text-primary' : 'text-default opacity-80'}`"
                            >Charts</v-btn>
                        </template>
                    </v-hover>

                    <!-- Faucet Link -->
                    <v-hover v-if="explorerStore.isDemo || explorerStore.faucet || (envStore.isAdmin && currentWorkspaceStore.public)">
                        <template v-slot:default="{ isHovering, props }">
                            <v-btn 
                                :color="isHovering || route.path === '/faucet' ? 'primary' : undefined" 
                                variant="plain" 
                                v-bind="props" 
                                :to="'/faucet'" 
                                :class="`opacity-100 d-flex align-center fill-height ${isHovering || route.path === '/faucet' ? 'text-primary' : 'text-default opacity-80'}`"
                            >Faucet</v-btn>
                        </template>
                    </v-hover>

                    <!-- DEX Link -->
                    <v-hover v-if="explorerStore.isDemo || explorerStore.v2Dex || (envStore.isAdmin && currentWorkspaceStore.public)">
                        <template v-slot:default="{ isHovering, props }">
                            <v-btn 
                                :color="isHovering || route.path === '/dex' ? 'primary' : undefined" 
                                variant="plain" 
                                v-bind="props" 
                                :to="'/dex'" 
                                :class="`opacity-100 d-flex align-center fill-height ${isHovering || route.path === '/dex' ? 'text-primary' : 'text-default opacity-80'}`"
                            >DEX</v-btn>
                        </template>
                    </v-hover>

                    <!-- Bridge Link -->
                    <v-hover v-if="explorerStore.isDemo || (envStore.isAdmin && currentWorkspaceStore.public)">
                        <template v-slot:default="{ isHovering, props }">
                            <v-btn 
                                :color="isHovering || route.path === '/bridge' ? 'primary' : undefined" 
                                variant="plain" 
                                v-bind="props" 
                                :to="'/bridge'" 
                                :class="`d-flex align-center fill-height ${isHovering || route.path === '/bridge' ? 'text-primary opacity-100' : 'text-default opacity-80'}`"
                            >Bridge</v-btn>
                        </template>
                    </v-hover>

                    <!-- Admin Links -->
                    <template v-if="envStore.isAdmin">
                        <v-divider vertical class="my-2"></v-divider>
                        <v-hover>
                            <template v-slot:default="{ isHovering, props }">
                                <v-btn 
                                    :color="isHovering || route.path === '/explorers' ? 'primary' : undefined" 
                                    variant="plain" 
                                    v-bind="props" 
                                    :to="'/explorers'" 
                                    :class="`opacity-100 d-flex align-center fill-height ${isHovering || route.path === '/explorers' ? 'text-primary' : 'text-default opacity-80'}`"
                                >Public Explorers</v-btn>
                            </template>
                        </v-hover>

                        <v-hover>
                            <template v-slot:default="{ isHovering, props }">
                                <v-btn 
                                    :color="isHovering || route.path === '/settings' ? 'primary' : undefined" 
                                    variant="plain" 
                                    v-bind="props" 
                                    :to="'/settings?tab=workspace'" 
                                    :class="`opacity-100 d-flex align-center fill-height ${isHovering || route.path === '/settings' ? 'text-primary' : 'text-default opacity-80'}`"
                                >Settings</v-btn>
                            </template>
                        </v-hover>

                        <v-hover>
                            <template v-slot:default="{ isHovering, props }">
                                <v-btn 
                                    variant="plain" 
                                    v-bind="props" 
                                    @click="logOut" 
                                    :to="'/logout'" 
                                    :class="`d-flex align-center fill-height ${isHovering ? 'text-error' : 'text-error opacity-80'}`"
                                >Logout</v-btn>
                            </template>
                        </v-hover>
                    </template>

                    <v-divider vertical class="my-4 mr-4"></v-divider>

                    <WalletConnector v-if="currentWorkspaceStore.id" :key="2" />
                </div>
            </v-container>
        </v-app-bar>
    </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useCurrentWorkspaceStore } from '../stores/currentWorkspace';
import { useEnvStore } from '../stores/env';
import { useExplorerStore } from '../stores/explorer';
import { useUserStore } from '../stores/user';
import { useRoute } from 'vue-router';
import WalletConnector from './WalletConnector.vue';

// Menu state controls
const blockchainMenuOpen = ref(false);
const tokensMenuOpen = ref(false);

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
    },
    mobile: {
        type: Boolean,
        default: false
    },
    drawer: {
        type: Boolean,
        default: false
    }
});

// Define emits
defineEmits(['update:drawer']);

// Store initialization
const currentWorkspaceStore = useCurrentWorkspaceStore();
const envStore = useEnvStore();
const explorerStore = useExplorerStore();
const userStore = useUserStore();

// Add route matching computed properties
const route = useRoute();

const isBlockchainActive = computed(() => {
    const blockchainRoutes = ['/transactions', '/txsInternal', '/blocks', '/contractsVerified', '/contracts'];
    return blockchainRoutes.some(path => route.path === path);
});

const isTokensActive = computed(() => {
    const tokenRoutes = [
        '/tokens', 
        '/toptokens', 
        '/tokenstxn',
        '/nfts',
        '/nft-top-contracts',
        '/nft-transfers'
    ];
    return tokenRoutes.some(path => route.path === path);
});

const logOut = () => {
    userStore.updateUser(null);
    document.location.reload();
};
</script>

<style>
.theme-background {
    background-color: var(--app-bar-background) !important;
}

.v-app-bar {
    color: var(--text-primary);
}

.v-navigation-drawer {
    color: var(--text-primary);
}

.v-app-bar {
    background-color: var(--app-bar-background) !important;
    color: var(--text-primary);
}

.v-app-bar.main-bar {
    border-bottom: 1px solid var(--border-color);
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
    color: var(--text-primary);
}

/* Menu styles */
.v-menu .v-list {
    background-color: var(--card-background) !important;
    border-radius: 8px;
    box-shadow: rgba(0, 0, 0, 0.1) 0px 0px 5px 0px, rgba(0, 0, 0, 0.1) 0px 0px 1px 0px;
    min-width: 220px;
    padding: 8px 0;
}

.v-menu .v-list-item {
    min-height: 32px;
    padding: 0 16px;
    font-size: 0.875rem;
    color: var(--text-primary);
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

/* Navigation Drawer Styles */
.v-navigation-drawer {
    background-color: var(--card-background) !important;
    color: var(--text-primary);
}

.v-navigation-drawer .v-list {
    background-color: var(--card-background) !important;
    color: var(--text-primary);
}

.v-navigation-drawer .v-list-item {
    min-height: 44px;
    color: var(--text-primary);
}

.v-navigation-drawer .v-list-item:hover,
.v-navigation-drawer .v-list-item.router-link-active {
    color: rgb(var(--v-theme-primary));
}

.v-navigation-drawer .custom-logo {
    max-height: 32px;
}

.v-navigation-drawer .v-list-group__items .v-list-item {
    padding-left: 32px;
}

.v-navigation-drawer .v-list-subheader {
    font-size: 0.75rem;
    min-height: 36px;
    padding: 0 16px;
    color: var(--text-secondary);
}

/* Logo styles */
.custom-logo {
    max-height: 40px;
}

/* Fix for text colors in buttons */
.v-btn.text-default {
    color: var(--text-primary) !important;
}

.v-btn.text-default:hover,
.v-btn.router-link-active {
    color: rgb(var(--v-theme-primary)) !important;
}

/* Opacity adjustments for better contrast in dark mode */
.v-theme--dark .opacity-80 {
    opacity: 0.9 !important;
}

.v-theme--dark .v-menu .v-list {
    box-shadow: rgba(0, 0, 0, 0.3) 0px 0px 5px 0px, rgba(0, 0, 0, 0.2) 0px 0px 1px 0px;
}
</style>
