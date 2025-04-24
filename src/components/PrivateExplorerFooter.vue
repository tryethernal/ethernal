<template>
    <v-footer class="footer">
        <v-container class="d-flex flex-column py-4">
            <!-- Links Columns Row -->
            <div class="d-flex flex-column flex-sm-row ga-md-8 ga-sm-1">
                <div class="d-flex flex-column mb-8">
                    <span class="text-body-2">
                        Block explorer & data analytics platform for evm chains.
                    </span>
                    <v-btn
                        @click="addToMetaMask"
                        variant="outlined"
                        size="small"
                        class="mt-2 px-2"
                        max-width="180px"
                        :title="'Add to MetaMask'">
                            <img :src="MetamaskIcon" class="metamask-icon mr-2" width="20" height="20" alt="MetaMask" />
                            <span class="text-body-2">Add to Metamask</span>
                    </v-btn>
                </div>

                <div class="d-flex flex-wrap">
                    <div class="d-flex flex-column ga-2 footer-links-section">
                        <span class="text-subtitle-2">Resources</span>
                        <a class="text-decoration-none text-body-2" v-for="link in resources" :key="link.name" :href="link.url" target="_blank">
                            {{ link.name }}
                        </a>
                    </div>

                    <div class="d-flex flex-column ga-2 footer-links-section">
                        <span class="text-subtitle-2">Community</span>
                        <a class="text-decoration-none text-body-2" v-for="link in community" :key="link.name" :href="link.url" target="_blank">
                            {{ link.name }}
                        </a>
                    </div>

                    <div class="d-flex flex-column ga-2 footer-links-section">
                        <span class="text-subtitle-2">Company</span>
                        <a class="text-decoration-none text-body-2" v-for="link in company" :key="link.name" :href="link.url" target="_blank">
                            {{ link.name }}
                        </a>
                    </div>
                </div>
            </div>

            <v-divider class="my-6"></v-divider>

            <!-- Copyright and Donation Row -->
            <div class="d-flex justify-space-between align-center">
                <div class="text-caption">
                    Powered by <a :href="`https://tryethernal.com?ref=${host}`" target="_blank">Ethernal</a> | v{{ envStore.version }} | Made with 🍷 in France
                </div>
            </div>
        </v-container>
    </v-footer>
</template>

<script setup>
import { useEnvStore } from '../stores/env';
import { useCurrentWorkspaceStore } from '../stores/currentWorkspace';
import MetamaskIcon from '../assets/metamask-fox.svg';

const envStore = useEnvStore();
const host = document.location.host;
const currentWorkspaceStore = useCurrentWorkspaceStore();

const resources = [
    {
        name: 'Documentation',
        url: 'https://doc.tryethernal.com'
    },
    {
        name: 'Github',
        url: 'https://github.com/tryethernal'
    }
];

const community = [
    {
        name: 'Twitter / X',
        url: 'https://x.com/tryethernal'
    },
    {
        name: 'Discord',
        url: 'https://discord.gg/jEAprf45jj'
    },
    {
        name: 'Telegram',
        url: 'https://t.me/antoinedc'
    }
];

const company = [
    {
        name: 'Home',
        url: 'https://tryethernal.com'
    },
    {
        name: 'Contact Us',
        url: 'https://tryethernal.com/contact-us'
    },
    {
        name: 'Terms of Service',
        url: 'https://tryethernal.com/terms'
    },
    {
        name: 'Privacy Policy',
        url: 'https://tryethernal.com/privacy'
    }
];

async function addToMetaMask() {
    try {
        if (!window.ethereum)
            return;

        await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
                chainId: currentWorkspaceStore.networkId,
                chainName: currentWorkspaceStore.name,
                nativeCurrency: {
                    name: currentWorkspaceStore.chain.token,
                    symbol: currentWorkspaceStore.chain.token,
                    decimals: 18
                },
                rpcUrls: [currentWorkspaceStore.rpcServer],
                blockExplorerUrls: [`https://app.${envStore.mainDomain}`]
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

.ga-8 {
    gap: 8px;
}

.ga-2 {
    gap: 8px;
}

.footer-links-section {
    min-width: 150px;
    margin-right: 24px;
}

@media (max-width: 600px) {
    .footer-links-section {
        min-width: calc(50% - 12px);
        margin-right: 0;
    }
}

@media (max-width: 400px) {
    .footer-links-section {
        min-width: 100%;
    }
}
</style> 