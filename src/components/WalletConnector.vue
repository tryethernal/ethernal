<template>
    <div>
        <v-btn v-if="!connectedAddress" prepend-icon="mdi-wallet" rounded size="small" variant="outlined" @click="connect">Connect Wallet</v-btn>
        <v-btn v-else prepend-icon="mdi-wallet" rounded size="small" variant="outlined">{{ shortenedConnectedAddress }}
            <template v-slot:prepend v-if="connectedAddress">
                {{ formattedBalance }} |
            </template>
            <template v-slot:append v-if="connectedAddress">
                | <v-icon @click="disconnect" class="ml-1">mdi-logout</v-icon>
            </template>
        </v-btn>
    </div>
</template>
<script>
import { storeToRefs } from 'pinia'
import { init, useOnboard } from '@web3-onboard/vue'
import { useCurrentWorkspaceStore } from '../stores/currentWorkspace'
import { useExplorerStore } from '../stores/explorer'
import { useWalletStore } from '../stores/walletStore'
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
                    token: currentWorkspaceStore.chain.token,
                    label: explorerStore.name || currentWorkspaceStore.name,
                    rpcUrl: explorerStore.rpcServer || currentWorkspaceStore.rpcServer
                }
            ]
        });

        const { connectWallet, disconnectConnectedWallet, connectedWallet } = useOnboard();
        console.log(connectedWallet.value)
        const connect = async () => connectWallet()
        const disconnect = async () => {
            alert('ok')
            disconnectConnectedWallet()
        }

        const state = onboard.state.select()
        state.subscribe(() => {
            if (!connectedWallet.value) {
                return;
            }
            const activeWallet = connectedWallet.value;
            walletStore.updateConnectedAddress(activeWallet.accounts[0].address);
            walletStore.updateProvider(activeWallet.provider);
            walletStore.updateCurrentBalance();
        });

        const { connectedAddress, formattedBalance, shortenedConnectedAddress } = storeToRefs(walletStore);

        return {
            connect,
            disconnect,
            connectedAddress,
            formattedBalance,
            shortenedConnectedAddress
        }
    },
}
</script>
