<template>
    <v-card class="mt-2">
        <v-card-text>
            <Contract-Call-Options
                :accounts="currentWorkspaceStore.accounts"
                :loading="loading"
                @senderSourceChanged="onSenderSourceChanged"
                @callOptionChanged="onCallOptionChanged"
                @rpcConnectionStatusChanged="onRpcConnectionStatusChanged" />
        </v-card-text>
    </v-card>

    <v-card class="my-4">
        <v-card-text>
            <v-text-field
                v-model="search"
                prepend-inner-icon="mdi-magnify"
                label="Filter methods"
                density="compact"
                hide-details
                variant="outlined"
            ></v-text-field>
            <v-divider class="my-4"></v-divider>

            <v-skeleton-loader v-if="loading" class="col-4" type="list-item-three-line"></v-skeleton-loader>
            <template v-else>
                <template v-if="contract.abi">
                    <v-row v-for="method in filteredMethods" :key="method.name" class="pb-4">
                        <v-col lg="6" md="6" sm="12">
                            <Contract-Read-Method
                                :active="walletStore.connectedAddress"
                                :contract="contract"
                                :method="method"
                                :options="callOptions"
                                :senderMode="senderMode" />
                        </v-col>
                    </v-row>
                </template>
                <template v-else>
                    Upload this contract's ABI to use it here.
                </template>
            </template>
        </v-card-text>
    </v-card>
</template>

<script setup>
import { defineProps, ref, computed, onMounted } from 'vue';

import ContractCallOptions from './ContractCallOptions.vue';
import ContractReadMethod from './ContractReadMethod.vue';

import { useCurrentWorkspaceStore } from '../stores/currentWorkspace';
import { useWalletStore } from '../stores/walletStore';

const props = defineProps(['contract']);

const currentWorkspaceStore = useCurrentWorkspaceStore();
const walletStore = useWalletStore();

const loading = ref(false);
const search = ref('');

const onSenderSourceChanged = (senderSource) => {
    console.log(senderSource);
};

const onCallOptionChanged = (callOption) => {
    console.log(callOption);
};

const onRpcConnectionStatusChanged = (rpcConnectionStatus) => {
    console.log(rpcConnectionStatus);
};

const contractReadMethods = computed(() => {
    if (!props.contract?.abi) return [];

    return props.contract.abi
        .filter(member => {
            return member.type === 'function' && 
                   (member.stateMutability === 'view' || member.stateMutability === 'pure' || member.constant);
        });
});

const filteredMethods = computed(() => {
    if (!search.value) return contractReadMethods.value;
    
    const searchLower = search.value.toLowerCase();
    return contractReadMethods.value.filter(method => 
        method.name.toLowerCase().includes(searchLower)
    );
});

onMounted(() => {
    if (!props.contract?.abi) return;
    
    // Log all read functions
    console.log(contractReadMethods.value);
});
</script> 
