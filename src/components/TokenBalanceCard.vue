<template>
    <v-card style="height: 100%">
        <template v-slot:subtitle>
            <div class="d-flex justify-space-between">
                <span>Your Balance</span>
                <Hash-Link v-if="connectedAddress" :type="'address'" :hash="connectedAddress" />
            </div>
        </template>
        <v-card-text class="text-h3 text-medium-emphasis" align="center">
            <template v-if="connectedAddress && !loadingBalance && !isConnectorLoading">
                <template v-if="connectedAccountBalance !== null">{{ formattedBalance }}</template>
                <template v-else>N/A</template>
            </template>
            <template v-else-if="!connectedAddress && isConnectorLoading || connectedAddress && loadingBalance">
                <v-skeleton-loader type="list-item"></v-skeleton-loader>
            </template>
            <Wallet-Connector-Mirror v-else prepend-icon="mdi-wallet" rounded size="small" variant="outlined" />
        </v-card-text>
    </v-card>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { readContract } from '@web3-onboard/wagmi';
import { formatNumber } from '@/lib/utils';
import { storeToRefs } from 'pinia';
import { useWalletStore } from '../stores/walletStore';
import { useCurrentWorkspaceStore } from '@/stores/currentWorkspace';
import WalletConnectorMirror from './WalletConnectorMirror.vue';
import HashLink from './HashLink.vue';
const ERC20_ABI = require('../abis/erc20.json');

const walletStore = useWalletStore();
const currentWorkspaceStore = useCurrentWorkspaceStore();
const props = defineProps({
    contract: {
        type: Object,
        required: true
    }
});

const { connectedAddress, isConnectorLoading } = storeToRefs(walletStore);
const { wagmiConfig } = storeToRefs(currentWorkspaceStore);
const connectedAccountBalance = ref(null);
const loadingBalance = ref(true);

const formattedBalance = computed(() => {
    if (connectedAccountBalance.value === null)
        return null;

    return `${formatNumber(connectedAccountBalance.value, { short: true, decimals: 2 })} ${props.contract.tokenSymbol}`;
});

watch(() => props.contract, (newContract) => {
    if (!newContract)
        return;

walletStore.$subscribe((_mutation, state) => {
        if (state.connectedAddress) {
            readContract(wagmiConfig.value, {
                abi: ERC20_ABI,
                address: newContract.address,
                functionName: 'balanceOf',
                args: [state.connectedAddress],
            })
            .then(balance => connectedAccountBalance.value = balance)
            .catch(error => console.error(error))
            .finally(() => loadingBalance.value = false);
        }
    })
}, { immediate: true })
</script>
