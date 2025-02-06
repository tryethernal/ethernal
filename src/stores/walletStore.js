import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { getBalance } from '@web3-onboard/wagmi';
import { useCurrentWorkspaceStore } from './currentWorkspace';

export const useWalletStore = defineStore('wallet', () => {
    const connectedAddress = ref(null);
    const currentBalance = ref(null);
    const connectedChainId = ref(null);
    const wagmiConnector = ref(null);
    const isConnectorLoading = ref(false);

    function updateIsConnectorLoading(loading) {
        isConnectorLoading.value = loading;
    }

    function updateConnectedAddress(address) {
        connectedAddress.value = address;
        if (address)
            updateCurrentBalance();
        else {
            currentBalance.value = null;
            connectedChainId.value = null;
        }
    }

    function updateConnectedChainId(chainId) {
        connectedChainId.value = chainId;
    }

    function updateCurrentBalance() {
        if (!connectedAddress.value) return;

        const currentWorkspaceStore = useCurrentWorkspaceStore();
        getBalance(currentWorkspaceStore.wagmiConfig, {
            address: connectedAddress.value,
            chainId: currentWorkspaceStore.networkId
        })
        .then(balance => currentBalance.value = balance)
        .catch(error => console.error(error));
    }

    function updateWagmiConnector(_wagmiConnector) {
        wagmiConnector.value = _wagmiConnector;
    }

    const formattedBalance = computed(() => {
        if (!currentBalance.value) return null;

        const rounded = parseFloat(currentBalance.value.formatted).toFixed(3);

        return `${rounded} ${currentBalance.value.symbol}`
    })

    const shortenedConnectedAddress = computed(() => {
        if (!connectedAddress.value) return null;

        return connectedAddress.value.slice(0, 6) + '...' + connectedAddress.value.slice(-4);
    })

    const parsedChainId = computed(() => connectedChainId.value ? parseInt(connectedChainId.value) : null);

    const isChainIdCorrect = computed(() => {
        const currentWorkspaceStore = useCurrentWorkspaceStore();
        return parsedChainId.value === parseInt(currentWorkspaceStore.networkId);
    });

    return {
        connectedAddress,
        currentBalance,
        updateConnectedAddress,
        updateCurrentBalance,
        formattedBalance,
        shortenedConnectedAddress,
        updateConnectedChainId,
        parsedChainId,
        isChainIdCorrect,
        updateWagmiConnector,
        wagmiConnector,
        isConnectorLoading,
        updateIsConnectorLoading
    }
});
