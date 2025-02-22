<template>
    <div>
        <v-btn v-if="isConnectorLoading" prepend-icon="mdi-wallet" rounded size="small" variant="outlined">Connecting...</v-btn>
        <v-btn v-else-if="!connectedAddress && !alreadyConnectedWallets.length" prepend-icon="mdi-wallet" rounded size="small" variant="outlined" @click="connect">Connect Wallet</v-btn>
        <v-btn v-else prepend-icon="mdi-wallet" rounded size="small" variant="outlined">{{ shortenedConnectedAddress }}
            <template v-slot:prepend v-if="connectedAddress">
                <span v-if="!isChainIdCorrect">
                    <v-tooltip :text="`Wrong network. Click to switch to chain ID ${expectedNetworkId} (currently connected to ${parsedChainId}).`" location="top">
                        <template v-slot:activator="{ props }">
                            <v-icon @click="switchNetwork" color="warning" v-bind="props">mdi-alert</v-icon>
                        </template>
                    </v-tooltip>
                    <span class="ml-1 mr-1">|</span>
                </span>
                <span v-if="formattedBalance !== null && formattedBalance !== undefined">
                    {{ formattedBalance }} |
                </span>
            </template>
            <template v-slot:append v-if="connectedAddress">
                | <v-icon @click="disconnect" class="ml-1">mdi-logout</v-icon>
            </template>
        </v-btn>
    </div>
</template>
<script>
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { init, useOnboard } from '@web3-onboard/vue'
import wagmi from '@web3-onboard/wagmi'
import { switchChain } from '@web3-onboard/wagmi'
import { toHex } from 'viem'
import bus from '../plugins/bus';
import { useCurrentWorkspaceStore } from '../stores/currentWorkspace'
import { useExplorerStore } from '../stores/explorer'
import { useWalletStore } from '../stores/walletStore'
import { useEnvStore } from '../stores/env'
import injectedModule from '@web3-onboard/injected-wallets';
import bitgetWalletModule from '@web3-onboard/bitget';
import coinbaseWalletModule from '@web3-onboard/coinbase';
import frameModule from '@web3-onboard/frame';
import walletConnectModule from '@web3-onboard/walletconnect';

export default {
    name: 'WalletConnector',
    setup() {
        const currentWorkspaceStore = useCurrentWorkspaceStore();
        const explorerStore = useExplorerStore();
        const walletStore = useWalletStore();

        const onboard = init({
            wagmi,
            accountCenter: {
                desktop: { enabled: false },
                mobile: { enabled: false }
            },
            appMetadata: {
                icon: explorerStore.themes.icon || 'https://app.tryethernal.com/favicon.ico',
                name: explorerStore.name || 'Ethernal',
                description: `${explorerStore.name || 'Ethernal'} Block Explorer`
            },
            connect: {
                showSidebar: false,
                autoConnectAllPreviousWallet: true
            },
            wallets: [walletConnectModule({ dappUrl: document.location.origin, projectId: '8f6704ea1d97d675e4959e762a46c829' }), injectedModule(), bitgetWalletModule(), coinbaseWalletModule(), frameModule()],
            chains: [
                {
                    id: currentWorkspaceStore.networkId,
                    token: currentWorkspaceStore.chain.token || 'ETH',
                    label: explorerStore.name || currentWorkspaceStore.name,
                    rpcUrl: explorerStore.rpcServer || currentWorkspaceStore.rpcServer
                }
            ]
        });

        const { connectWallet, disconnectConnectedWallet, connectedWallet, alreadyConnectedWallets, connectingWallet, connectedChain } = useOnboard();
        const { isConnectorLoading, isChainIdCorrect, connectedAddress, formattedBalance, shortenedConnectedAddress, parsedChainId } = storeToRefs(walletStore);

        const connect = async () => connectWallet()

        // The wallet subscription is supposed to return a unusbscribe handler, but it doesn't seem to work.
        // So we use this flag to manually "deactivate" it.
        let deactivatedWalletSubscription = false;
        const disconnect = () => {
            deactivatedWalletSubscription = true;
            disconnectConnectedWallet()
            localStorage.removeItem('wagmi.store');
            walletStore.updateIsConnectorLoading(false);
        }

        let fetchingWallets = ref(false);
        walletStore.updateIsConnectorLoading(false);
        const wallets = onboard.state.select('wallets');
        wallets.subscribe(update => {
            if (deactivatedWalletSubscription) return;
            fetchingWallets.value = !update.length;
            walletStore.updateIsConnectorLoading(fetchingWallets.value || connectingWallet.value);
        });

        const state = onboard.state.select()
        state.subscribe(() => {
            const activeWallet = connectedWallet.value;
            if (activeWallet) {
                const { wagmiConnector } = activeWallet;
                walletStore.updateWagmiConnector(wagmiConnector);
                const wagmiConfig = onboard.state.get().wagmiConfig;
                currentWorkspaceStore.updateWagmiConfig(wagmiConfig);
                walletStore.updateIsConnectorLoading(false);
                walletStore.updateConnectedAddress(activeWallet?.accounts[0]?.address);
                walletStore.updateConnectedChainId(connectedChain.value?.id);
            }
            else {
                walletStore.updateConnectedAddress(null);
            }
        });

        const { networkId: expectedNetworkId } = storeToRefs(currentWorkspaceStore);

        async function switchNetwork() {
            const wagmiConfig = onboard.state.get().wagmiConfig;
            const { wagmiConnector } = connectedWallet.value;

            const explorerStore = useExplorerStore();
            const envStore = useEnvStore();

            function handleUnhandledRejection(event) {
                if (event.reason && event.reason.code === 4902) {
                    let domain = explorerStore.domain;
                    if (explorerStore.domains && explorerStore.domains.length)
                        domain = explorerStore.domains[0].domain;
                    else
                        domain = envStore.mainDomain;

                    const addEthereumChainParameter = {
                        chainId: toHex(expectedNetworkId.value),
                        chainName: explorerStore.name || currentWorkspaceStore.name,
                        nativeCurrency: {
                            name: currentWorkspaceStore.chain.token || 'ETH',
                            symbol: currentWorkspaceStore.chain.token || 'ETH',
                            decimals: 18
                        },
                        rpcUrls: [explorerStore.rpcServer || currentWorkspaceStore.rpcServer],
                        blockExplorerUrls: [`https://${domain}`],
                    }

                    window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [addEthereumChainParameter]
                    });
                }
                window.removeEventListener('unhandledrejection', handleUnhandledRejection);
            }

            window.addEventListener('unhandledrejection', handleUnhandledRejection);
            switchChain(wagmiConfig, {
                chainId: expectedNetworkId.value,
                connector: wagmiConnector
            });
        }

        return {
            connect,
            disconnect,
            connectedAddress,
            formattedBalance,
            shortenedConnectedAddress,
            alreadyConnectedWallets,
            connectingWallet,
            connectedWallet,
            fetchingWallets,
            isConnectorLoading,
            isChainIdCorrect,
            parsedChainId,
            expectedNetworkId,
            switchNetwork
        }
    },
    mounted() {
        bus.on('connect', () => {
            this.connect();
        });
    }
}
</script>

