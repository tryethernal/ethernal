<template>
    <v-btn :loading="loading" size="small" color="primary" @click="claim(item)">
        Claim withdrawal
    </v-btn>
</template>

<script setup>
import { inject, ref, defineEmits } from 'vue';
import defineCustomChain from '@/lib/chains';
import { useCurrentWorkspaceStore } from '@/stores/currentWorkspace';
import { useWalletStore } from '@/stores/walletStore';

const currentWorkspace = useCurrentWorkspaceStore();
const walletStore = useWalletStore();

const $server = inject('$server');

const emit = defineEmits(['success', 'error']);

const props = defineProps({
    hash: {
        type: String,
        required: true
    },
    messageNumber: {
        type: Number,
        required: true
    }
});

const loading = ref(false);

const claim = async () => {
    loading.value = true;

    try {
        const { data: { callData, to, l1ChainId, l1RpcServer } } = await $server.getOrbitWithdrawalClaimCallData(props.hash, props.messageNumber);

        await sendTransaction(callData, to, l1ChainId, l1RpcServer);
    } catch (error) {
        emit('error', error.shortMessage || error.cause && error.cause.details || error.message);
    } finally {
        loading.value = false;
    }
};

const sendTransaction = async (callData, to, l1ChainId, l1RpcServer) => {
    try {
        const browserClient = currentWorkspace.getViemBrowserClient;

        const hash = await browserClient.sendTransaction({
            data: callData,
            to,
            chain: defineCustomChain(l1ChainId, l1RpcServer),
            account: walletStore.connectedAddress,
        });
        emit('success', hash);
    } catch (error) {
        emit('error', error.shortMessage || error.cause && error.cause.details || error.message);
    }
};
</script>
