<template>
    <v-row v-if="step && step.op" class="ma-1 pa-1 pb-0 mb-0">
        <template v-if="step.depth > 1">
            <v-col :class="{'py-0': true, 'border-left': step.depth > 2 && idx == step.depth - 2}" v-for="(n, idx) in new Array(step.depth - 1)" :key="idx" cols="1">
            </v-col>
        </template>
        <v-col class="py-0 my-0" style="overflow-y: auto;" :key="step.depth || 0">
            <v-card border="false">
                <v-card-text class="pa-0 ma-0">
                    <span v-if="step.depth > 1" class="font-weight-black">
                        |<br>
                        |-->
                    </span>
                    <v-chip size="small" class="bg-primary mr-2">{{ step.op || 'UNKNOWN' }}</v-chip>
                    <v-chip v-if="step.contract && step.contract.proxyContract" size="small" class="bg-primary mr-2">PROXY</v-chip>
                    <template v-if="step.value && step.value != '' && step.value != '0'">[{{ $fromWei(step.value, 'ether', token) }}] </template>
                    <Hash-Link v-if="step.address" :type="'address'" :hash="step.address" :notCopiable="true" :fullHash="true" :withName="true" :contract="step.contract"/><span v-if="transactionDescription">.{{ transactionDescription.functionFragment.name }}(</span>
                    <template v-if="transactionDescription && transactionDescription.functionFragment && transactionDescription.functionFragment.inputs">
                        <div v-for="(input, index) in transactionDescription.functionFragment.inputs" :key="`in-${index}`">
                            <Formatted-Sol-Var :input="input" :value="transactionDescription.args ? transactionDescription.args[index] : null" class="ml-8" />
                        </div><span :class="transactionDescription.functionFragment.inputs.length > 0 ? 'ml-4' : ''">)</span>
                        <template v-if="step.returnData && transactionDescription.functionFragment.outputs && transactionDescription.functionFragment.outputs.length">
                            <template v-if="transactionDescription.functionFragment.outputs.length > 0">
                                =>
                            </template>
                            <template v-if="transactionDescription.functionFragment.outputs.length > 1 ">
                                (<div v-for="(output, index) in transactionDescription.functionFragment.outputs" :key="`out-${index}`">
                                    <Formatted-Sol-Var  :input="output" :value="decodeOutput(index)" />
                                </div>)
                            </template>
                            <template v-else>
                                <Formatted-Sol-Var :depth="0" :input="transactionDescription.functionFragment.outputs[0]" :value="decodeOutput(0)" />
                            </template>
                        </template>
                    </template>
                    <template v-else-if="step.input || step.returnData">
                        <ul>
                            <li :class="{'raw-input': !expandInput}" v-if="step.input">
                                <span v-if="step.depth > 1" class="font-weight-black">|</span> <b class="mr-2">Input:</b>
                                <a class="no-decoration" href="#" @click.prevent="expandInput = true" v-if="!expandInput">[ + ]</a>
                                <a class="no-decoration" href="#" @click.prevent="expandInput = false" v-else>[ - ]</a>
                                {{ step.input }}
                            </li>
                            <li :class="{'raw-input': !expandOutput}" v-if="step.returnData">
                                <span v-if="step.depth > 1" class="font-weight-black">|</span> <b class="mr-2">Output:</b>
                                <a class="no-decoration" href="#" @click.prevent="expandOutput = true" v-if="!expandOutput">[ + ]</a>
                                <a class="no-decoration" href="#" @click.prevent="expandOutput = false" v-else>[ - ]</a>
                                {{ step.returnData }}
                            </li>
                        </ul>
                    </template>
                </v-card-text>
            </v-card>
        </v-col>
    </v-row>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ethers } from 'ethers';
import { storeToRefs } from 'pinia';
import { useExplorerStore } from '../stores/explorer';
import HashLink from './HashLink.vue';
import FormattedSolVar from './FormattedSolVar.vue';
import ERC20_ABI from '../abis/erc20.json';
import ERC721_ABI from '../abis/erc721.json';
import SELECTORS from '../abis/selectors.json';

// Props
const props = defineProps(['step']);

// Store
const { token } = storeToRefs(useExplorerStore());

// Reactive state
const transactionDescription = ref(null);
const expandInput = ref(false);
const expandOutput = ref(false);

// Helper functions
const zeroXify = (input) => {
    if (!input) return '0x';
    return input.startsWith('0x') ? input : `0x${input}`;
};

const getMethodSignature = (input) => {
    if (!input || input.length < 10) return null;
    return input.slice(0, 10).toLowerCase(); // Get first 4 bytes + 0x
};

// Computed
const jsonInterface = computed(() => {
    try {
        if (!props.step) return null;
        
        // If we have a contract with ABI, use it
        if (props.step.contract) {
            const contract = props.step.contract.proxyContract ? props.step.contract.proxyContract : props.step.contract;
            if (contract && contract.abi) {
                return new ethers.utils.Interface(contract.abi);
            }
        }

        // If no ABI but we have input, check against known selectors
        if (props.step.input) {
            const methodSig = getMethodSignature(props.step.input);
            if (!methodSig) return null;

            // Check if it's an ERC20 function
            if (SELECTORS.erc20.functions.includes(methodSig)) {
                return new ethers.utils.Interface(ERC20_ABI);
            }

            // Check if it's an ERC721 function
            if (SELECTORS.erc721.functions.includes(methodSig)) {
                return new ethers.utils.Interface(ERC721_ABI);
            }
        }
        
        return null;
    } catch (error) {
        console.error('Error creating interface:', error);
        return null;
    }
});

// Methods
const decodeOutput = (index) => {
    try {
        if (!props.step.returnData || !transactionDescription.value || !transactionDescription.value.functionFragment) return '';
        if (!jsonInterface.value) return '';
        const decodedData = jsonInterface.value.decodeFunctionResult(
            transactionDescription.value.functionFragment,
            zeroXify(props.step.returnData)
        );
        // Handle both array and single return value cases
        return Array.isArray(decodedData) ? decodedData[index] : decodedData;
    } catch (error) {
        console.error('Error decoding output:', error);
        return '';
    }
};

// Watch
watch(() => [props.step.contract, props.step.input], ([newContract, newInput]) => {
    if (!newInput) return;
    
    if (jsonInterface.value) {
        try {
            // Store the parsed transaction in transactionDescription
            transactionDescription.value = jsonInterface.value.parseTransaction({ data: zeroXify(newInput) });
        } catch(_error) {
            console.log('Error parsing transaction:', _error);
            transactionDescription.value = null;
        }
    }
}, { immediate: true });
</script>

<style scoped>
li {
    list-style-type: none;
}
</style>
