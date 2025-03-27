<template>
    <div>
        <div class="font-weight-bold">{{ method.name }}</div>
        <v-text-field
            variant="outlined"
            density="compact"
            hide-details="auto"
            class="py-1"
            v-model="params[inputIdx]"
            v-for="(input, inputIdx) in method.inputs" :key="inputIdx"
            :disabled="!active"
            :label="inputSignature(input)">
        </v-text-field>
        <div class="col-4 px-0 py-1">
            <v-text-field
                small
                variant="outlined"
                density="compact"
                v-model="valueInEth"
                type="number"
                hide-details="auto"
                :disabled="!active"
                :label="`Value (in ${currentWorkspaceStore.chain.token})`">
            </v-text-field>
        </div>
        <div class="bg-grey-lighten-3 pa-2 mt-1" v-show="result.txHash || result.message">
            <div v-show="result.txHash">
                Tx: <a :href="`/transaction/${result.txHash}`" target="_blank">{{ result.txHash }}</a>
            </div>
            <div v-if="result.txHash" class="mt-1">
                <template v-if="receipt">
                    <template v-if="receipt.status == 'success'">
                        <v-icon size="small" color="success-lighten-1">mdi-check-circle</v-icon>
                        Transaction successful
                    </template>
                    <template v-else>
                        <v-icon size="small" color="error-lighten-1">mdi-alert-circle</v-icon>
                        {{ result.message }}
                    </template>
                </template>
                <template v-else>
                    <v-progress-circular class="mr-2" size="16" width="2" indeterminate color="primary"></v-progress-circular>Waiting for receipt...
                </template>
            </div>
            <div v-else-if="result.message">
                {{ result.message }}
            </div>
        </div>
        <v-divider class="my-2"></v-divider>
        <div class="d-flex align-center">
            <v-btn :disabled="!active" v-if="senderMode == 'metamask'" :loading="loading" variant="flat" class="mt-1" @click="sendWithMetamask()">Query</v-btn>
            <v-btn :disabled="!active" v-else :loading="loading" variant="flat" class="mt-1" @click="sendWithAccount()">Query</v-btn>
            <v-checkbox class="ml-2" v-model="simulate" label="Simulate before sending" density="compact" hide-details></v-checkbox>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import Web3 from 'web3';
import { parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { useCurrentWorkspaceStore } from '@/stores/currentWorkspace';
import { useWalletStore } from '@/stores/walletStore';
import { sanitize, processMethodCallParam } from '../lib/utils';

const props = defineProps({
    method: Object,
    contract: Object,
    signature: String,
    senderMode: String,
    options: Object,
    active: Boolean
});

const currentWorkspaceStore = useCurrentWorkspaceStore();
const walletStore = useWalletStore();

const valueInEth = ref(0);
const params = ref({});
const receipt = ref(null);
const result = ref({
    txHash: null,
    message: null
});
const simulate = ref(false);
const web3 = new Web3();
const loading = ref(false);

const value = computed(() => {
    return web3.utils.toWei(valueInEth.value.toString(), 'ether');
});

const inputSignature = (input) => {
    if (input.type == 'tuple') {
        return `${input.name ? input.name : 'tuple'}(${input.components.map((cpt) => `${cpt.type}${cpt.name ? ` ${cpt.name}` : ''}`).join(', ')})`;
    }
    else
        return `${input.type}${input.name ? ` ${input.name}` : ''}`;
};

const processedParams = computed(() => {
    const processedParams = {};
    for (let i = 0; i < props.method.inputs.length; i++) {
        processedParams[i] = processMethodCallParam(params.value[i], props.method.inputs[i].type);
    }
    return processedParams;
});

const simulateTransaction = async (options) => {
    try {
        const publicClient = currentWorkspaceStore.getViemPublicClient;
        const { request } = await publicClient.simulateContract(options);
        return { success: true, request };
    } catch (error) {
        console.log(JSON.stringify(error, null, 2));
        return { success: false, message: error.shortMessage || error.message || error.reason };
    }
}

const sendWithMetamask = async () => {
    const browserClient = currentWorkspaceStore.getViemBrowserClient;

    const options = sanitize({
        address: props.contract.address,
        abi: props.contract.abi,
        functionName: props.method.name,
        args: Object.values(processedParams.value),
        chainId: parseInt(currentWorkspaceStore.networkId),
        gas: currentWorkspaceStore.gasLimit ? BigInt(currentWorkspaceStore.gasLimit) : undefined,
        gasPrice: currentWorkspaceStore.gasPrice ? BigInt(currentWorkspaceStore.gasPrice) : undefined,
        value: parseEther(valueInEth.value.toString()),
        connector: walletStore.wagmiConnector,
        account: walletStore.connectedAddress
    });

    sendTransaction(browserClient, options);
};

const sendWithAccount = async () => {
    if (!props.options.from || !props.options.from.address)
        return result.value.message = 'You must select a "from" address.';

    if (!props.options.gasLimit || parseInt(props.options.gasLimit) < 1)
        return result.value.message = 'You must set a gas limit';

    const options = sanitize({
        address: props.contract.address,
        abi: props.contract.abi,
        functionName: props.method.name,
        args: Object.values(processedParams.value),
        gasPrice: currentWorkspaceStore.gasPrice,
        value: value.value,
        account: props.options.from.privateKey ? privateKeyToAccount(props.options.from.privateKey) : props.options.from.address
    });

    sendTransaction(currentWorkspaceStore.getViemWalletClient, options);
};

const sendTransaction = async (client, options) => {
    loading.value = true;
    receipt.value = null;
    result.value = {
        txHash: null,
        message: null
    };

    const publicClient = currentWorkspaceStore.getViemPublicClient;
    let request;

    if (simulate.value) {
        const res = await simulateTransaction(options);
        if (!res.success) {
            loading.value = false;
            return result.value.message = `Transaction simulation failed with error: ${res.message}`;
        }
        request = res.request;
    }

    try {
        const hash = await client.writeContract(request || options)
        result.value.txHash = hash;
        receipt.value = await publicClient.waitForTransactionReceipt({ hash })
        if (receipt.value.status == 'reverted') {
            const res = await simulateTransaction(options);
            if (!res.success) {
                loading.value = false;
                return result.value.message = `Transaction failed with error: ${res.message}`;
            }
            else
                result.value.message = `Transaction failed without a message`; // Maybe there is a better way to handle that, but we shouldn't really get here...
        }
    } catch (error) {
        if (error.message || error.reason)
            result.value.message = `Error: ${error.shortMessage || error.message || error.reason}`;
        else
            result.value.message = 'Error while sending the transaction';
    } finally {
        loading.value = false;
    }
}
</script>
