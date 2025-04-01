<template>
    <v-footer class="footer">
        <v-container class="d-flex flex-column py-4">
            <!-- Links Columns Row -->
            <div class="d-flex ga-16">
                <div class="d-flex flex-column">
                    <span class="text-body-2">
                        Block explorer & data analytics platform for {{ explorerStore.name }}.
                    </span>
                    <v-btn
                        @click="addToMetaMask"
                        variant="outlined"
                        max-width="180px"
                        size="small"
                        class="mt-2 px-2"
                        :title="'Add to MetaMask'">
                            <img :src="MetamaskIcon" class="metamask-icon mr-2" width="20" height="20" alt="MetaMask" />
                            <span class="text-body-2">Add to Metamask</span>
                    </v-btn>
                </div>

                <div class="d-flex flex-column" v-if="explorerStore.themes.links.length > 0">
                    <a v-for="link in explorerStore.themes.links" :href="link.url" class="text-decoration-none mb-2">
                        <v-icon size="small" :icon="link.icon" />
                        {{ link.name }}
                    </a>
                </div>
            </div>

            <v-divider class="my-6"></v-divider>

            <!-- Copyright and Donation Row -->
            <div class="d-flex justify-space-between align-center">
                <div class="text-caption">
                    Powered by <a :href="`https://tryethernal.com?ref=${host}`" target="_blank">Ethernal</a> | v{{ env.version }} | Made with 🍷 in France
                </div>
            </div>
        </v-container>
    </v-footer>
</template>

<script setup>
import { computed } from 'vue';
import { useEnvStore } from '../stores/env';
import { useExplorerStore } from '../stores/explorer';
import { useCurrentWorkspaceStore } from '../stores/currentWorkspace';
import MetamaskIcon from '../assets/metamask-fox.svg';

const env = useEnvStore();
const host = document.location.host;
const explorerStore = useExplorerStore();
const currentWorkspaceStore = useCurrentWorkspaceStore();

const formattedExpectedChainId = computed(() => {
    return `0x${parseInt(currentWorkspaceStore.networkId).toString(16)}`;
});

async function addToMetaMask() {
    try {
        if (!window.ethereum)
            return;

        let domain = explorerStore.domain;
        if (explorerStore.domains && explorerStore.domains.length)
            domain = explorerStore.domains[0].domain;

        await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
                chainId: formattedExpectedChainId.value,
                chainName: explorerStore.name,
                nativeCurrency: {
                    name: explorerStore.token || 'Ether',
                    symbol: explorerStore.token || 'ETH',
                    decimals: 18
                },
                rpcUrls: [explorerStore.rpcServer],
                blockExplorerUrls: [`https://${domain}`]
            }]
        });
    } catch (error) {
        console.error('Failed to add network to MetaMask:', error);
    }
}
</script>

<style scoped>
.footer {
    border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.metamask-icon {
    vertical-align: middle;
}
</style> 