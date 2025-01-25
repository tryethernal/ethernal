import { ref, computed, markRaw } from 'vue';
import { defineStore } from 'pinia';
import { ethers } from 'ethers';
import { useCurrentWorkspaceStore } from './currentWorkspace';

export const useWalletStore = defineStore('wallet', () => {
    const connectedAddress = ref(null);
    const provider = ref(null);
    const currentBalance = ref(null);

    function updateConnectedAddress(address) {
        connectedAddress.value = address;
    }

    function updateProvider(walletProvider) {
        provider.value = markRaw(new ethers.providers.Web3Provider(walletProvider));
    }

    async function updateCurrentBalance() {
        if (!provider.value) return;

        currentBalance.value = await provider.value.getBalance(connectedAddress.value);
    }

    const formattedBalance = computed(() => {
        if (!currentBalance.value) return null;

        const currentWorkspaceStore = useCurrentWorkspaceStore();
        return `${ethers.utils.formatEther(currentBalance.value)} ${currentWorkspaceStore.chain.token}`
    })

    const shortenedConnectedAddress = computed(() => {
        if (!connectedAddress.value) return null;

        return connectedAddress.value.slice(0, 6) + '...' + connectedAddress.value.slice(-4);
    })

    return {
        connectedAddress,
        provider,
        currentBalance,
        updateConnectedAddress,
        updateProvider,
        updateCurrentBalance,
        formattedBalance,
        shortenedConnectedAddress
    }
});
