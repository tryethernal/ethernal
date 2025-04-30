<template>
    <template v-if="parsedTransactionData">
        {{ `${parsedTransactionData.functionFragment.name}(\n` }}
        <div class="ml-4" style="white-space: pre;" v-for="(input, index) in parsedTransactionData.functionFragment.inputs" :key="index">
            <Formatted-Sol-Var :input="input" :value="parsedTransactionData.args[index]" />
        </div>
        )
    </template>
    <template v-else>
        <div style="float: right;">
            <a href="#" :class="{ 'no-decoration': !displayUtf8Data }" @click.prevent="switchDataFormatting('hex')">Hex</a> | <a href="#" :class="{ 'no-decoration': displayUtf8Data }" @click.prevent="switchDataFormatting('utf8')">UTF-8</a>
        </div>
        <b>Signature:</b> {{ sigHash }}<br>
        <b>Data:</b> 
        <div style="word-break: break-all; white-space: normal;" class="data-container">
            <div class="truncated-content">
                {{ isExpanded ? convertedData : truncatedData }}
            </div>
            <div v-if="showToggle" class="text-center mt-2">
                <a href="#" class="no-decoration text-uppercase d-flex align-center justify-center" @click.prevent="toggleExpand">
                    <v-icon size="small" class="mr-1">mdi-eye{{ isExpanded ? '-off' : '' }}</v-icon>
                    {{ isExpanded ? 'VIEW LESS' : 'VIEW ALL' }}
                </a>
            </div>
        </div>
    </template>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { ethers } from 'ethers';
import web3 from 'web3';
import { findAbiForFunction } from '@/lib/abi';
import FormattedSolVar from './FormattedSolVar.vue';

// Constants
const MAX_DISPLAY_CHARS = 500;

// Props
const props = defineProps({
    data: String,
    value: [String, Number],
    abi: Array,
    to: String
});

// Reactive state
const parsedTransactionData = ref(null);
const displayUtf8Data = ref(false);
const isExpanded = ref(false);

// Methods
const switchDataFormatting = (formatting) => {
    displayUtf8Data.value = formatting === 'utf8';
};

const toggleExpand = () => {
    isExpanded.value = !isExpanded.value;
};

const getSignatureFromFragment = (fragment) => {
    if (!fragment.inputs.length)
        return `${fragment.name}()`;
    else
        return `${fragment.name}(` + fragment.inputs.map((input) => `${input.type} ${input.name}`).join(', ') + ')';
};

// Computed properties
const sigHash = computed(() => props.data && props.data !== '0x' ? props.data.slice(0, 10) : null);
const convertedData = computed(() => displayUtf8Data.value ? web3.utils.hexToAscii(props.data) : props.data);
const truncatedData = computed(() => {
    if (!convertedData.value) return '';
    return convertedData.value.length > MAX_DISPLAY_CHARS ? 
        convertedData.value.substring(0, MAX_DISPLAY_CHARS) + '...' : 
        convertedData.value;
});
const showToggle = computed(() => convertedData.value && convertedData.value.length > MAX_DISPLAY_CHARS);

// Lifecycle hook
onMounted(() => {
    const contractAbi = props.abi ? props.abi : findAbiForFunction(props.data.slice(0, 10));

    if (contractAbi) {
        const jsonInterface = new ethers.utils.Interface(contractAbi);
        parsedTransactionData.value = jsonInterface.parseTransaction({ data: props.data, value: props.value });
    }
});
</script>

<style scoped>
.no-decoration {
    text-decoration: none;
    color: rgb(var(--v-theme-primary));
}

.v-card-text {
    line-height: 1.375rem;
    color: rgb(var(--v-theme-on-surface));
}

.data-container {
    position: relative;
}

.truncated-content {
    position: relative;
}

.v-card {
    background-color: rgb(var(--v-theme-surface));
    color: rgb(var(--v-theme-on-surface));
}

:deep(.v-icon) {
    color: rgb(var(--v-theme-on-surface));
}

:deep(b) {
    color: rgb(var(--v-theme-on-surface));
}
</style>
