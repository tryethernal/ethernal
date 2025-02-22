<template>
    <div>
        <div v-if="isConnectorLoading">
            <v-btn :width="width" :prepend-icon="prependIcon" :rounded="rounded" :size="size" :variant="variant">Connecting...</v-btn>
        </div>
        <div v-else>
            <v-btn :width="width" @click="connect()" :prepend-icon="prependIcon" :rounded="rounded" :size="size" :variant="variant">Connect Wallet</v-btn>
        </div>
    </div>
</template>
<script>
import { storeToRefs } from 'pinia';
import bus from '../plugins/bus';
import { useWalletStore } from '../stores/walletStore';

export default {
    name: 'WalletConnectorMirror',
    props: ['prepend-icon', 'rounded', 'size', 'variant', 'width'],
    setup() {
        const walletStore = useWalletStore();
        const { isConnectorLoading } = storeToRefs(walletStore);

        const connect = () => bus.emit('connect');

        return { isConnectorLoading, connect };
    }
}
</script>
