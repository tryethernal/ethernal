<template>
    <div class="pa-2 grey lighten-3">
        <div v-if="parsedTransactionData">
            <div class="mb-2">
                Function: {{ getSignatureFromFragment(parsedTransactionData.functionFragment) }}
            </div>
            Params:
            <div v-for="(input, index) in parsedTransactionData.functionFragment.inputs" :key="index">
                {{ input.name }}: {{ parsedTransactionData.args[index] }}
            </div>
        </div>
         <div v-else>
            <i>Upload contract artifact <router-link :to="`/address/${this.to}?tab=contract`">here</router-link> to decode function parameters.</i>
        </div>
    </div>
</template>
<script>
import { ethers } from 'ethers';

export default {
    name: 'TransactionFunctionCall',
    props: ['data', 'value', 'abi', 'to'],
    data: () => ({
        parsedTransactionData: null
    }),
    mounted: function() {
        if (this.abi) {
            const jsonInterface = new ethers.utils.Interface(this.abi);
            this.parsedTransactionData = jsonInterface.parseTransaction({ data: this.data, value: this.value });
        }
    },
    methods: {
        getSignatureFromFragment: function(fragment) {
            if (!fragment.inputs.length) return;
            return `${fragment.name}(` + fragment.inputs.map((input) => `${input.type} ${input.name}`).join(', ') + ')'
        }
    }
}
</script>
