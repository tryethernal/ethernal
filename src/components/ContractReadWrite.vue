<template>
    <div>
        <v-card class="mt-2">
            <v-card-text>
                <Contract-Call-Options
                    :accounts="currentWorkspaceStore.accounts"
                    :loading="loading"
                    @senderSourceChanged="onSenderSourceChanged"
                    @callOptionChanged="onCallOptionChanged" />
            </v-card-text>
        </v-card>

        <v-card class="my-4">
            <v-card-text>
                <template v-if="contract.abi">
                    <v-text-field
                        v-model="search"
                        prepend-inner-icon="mdi-magnify"
                        label="Filter methods"
                        density="compact"
                        hide-details
                        variant="outlined"></v-text-field>

                    <v-divider class="my-4"></v-divider>

                    <v-row v-for="method in filteredMethods" :key="method.name" class="pb-4">
                        <v-col lg="6" md="6" sm="12">
                            <template v-if="forceTab === 'read'">
                                <Contract-Read-Method
                                    :contract="contract"
                                    :method="method" />
                            </template>
                            <template v-else>
                                <Contract-Write-Method
                                    :active="isConnectionReady"
                                    :contract="contract"
                                    :method="method"
                                    :options="callOptions"
                                    :senderMode="senderMode" />
                            </template>
                        </v-col>
                    </v-row>
                </template>
                <template v-else>
                    Verify the contract source code <a href="#code" class="text-primary text-decoration-none">here</a>.
                </template>
            </v-card-text>
        </v-card>
    </div>
</template>

<script setup>
import { defineProps, ref, computed, watch } from 'vue';

import ContractCallOptions from './ContractCallOptions.vue';
import ContractReadMethod from './ContractReadMethod.vue';
import ContractWriteMethod from './ContractWriteMethod.vue';

import { useCurrentWorkspaceStore } from '../stores/currentWorkspace';
import { useWalletStore } from '../stores/walletStore';

const props = defineProps({
    contract: {
        type: Object,
        required: true
    },
    forceTab: {
        type: String,
        default: 'read'
    }
});

const currentWorkspaceStore = useCurrentWorkspaceStore();
const walletStore = useWalletStore();

const loading = ref(false);
const search = ref('');
const senderMode = ref(null);
const callOptions = ref({});

const emit = defineEmits(['update-filtered-counts']);

const onSenderSourceChanged = (senderSource) => {
    senderMode.value = senderSource;
};

const onCallOptionChanged = (option) => {
    callOptions.value = option;
};

const isConnectionReady = computed(() => {
    return senderMode.value == 'metamask' && !!walletStore.connectedAddress ||
        senderMode.value == 'accounts' && !!callOptions.value.from;
});

const readMethods = computed(() => {
    if (!props.contract?.abi) return [];

    return props.contract.abi
        .filter(member => {
            if (member.type !== 'function') return false;
            return member.stateMutability === 'view' || 
                   member.stateMutability === 'pure' || 
                   member.constant;
        });
});

const writeMethods = computed(() => {
    if (!props.contract?.abi) return [];

    return props.contract.abi
        .filter(member => {
            if (member.type !== 'function') return false;
            return member.stateMutability === 'nonpayable' || 
                   member.stateMutability === 'payable' ||
                   (!member.constant && !member.stateMutability);
        });
});

const contractMethods = computed(() => {
    return props.forceTab === 'read' ? readMethods.value : writeMethods.value;
});

const filteredReadCount = computed(() => {
    if (!search.value) return 0;
    const searchLower = search.value.toLowerCase();
    return readMethods.value.filter(method => 
        method.name.toLowerCase().includes(searchLower)
    ).length;
});

const filteredWriteCount = computed(() => {
    if (!search.value) return 0;
    const searchLower = search.value.toLowerCase();
    return writeMethods.value.filter(method => 
        method.name.toLowerCase().includes(searchLower)
    ).length;
});

// Watch for changes in filtered counts and emit them
watch([filteredReadCount, filteredWriteCount, search], () => {
    emit('update-filtered-counts', {
        read: search.value ? filteredReadCount.value : readMethods.value.length,
        write: search.value ? filteredWriteCount.value : writeMethods.value.length
    });
}, { immediate: true });

const filteredMethods = computed(() => {
    if (!search.value) return contractMethods.value;
    
    const searchLower = search.value.toLowerCase();
    return contractMethods.value.filter(method => 
        method.name.toLowerCase().includes(searchLower)
    );
});
</script> 