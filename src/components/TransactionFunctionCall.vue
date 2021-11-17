<template>
    <div class="pa-2 grey lighten-3">
        <div v-if="parsedTransactionData">
            <div class="mb-2">
                Function: {{ getSignatureFromFragment(parsedTransactionData.functionFragment) }}
            </div>
            Params:
            <div v-for="(input, index) in parsedTransactionData.functionFragment.inputs" :key="index">
                {{ input.name }}:
                <span v-if="input.type == 'address'"><Hash-Link :type="'address'" :fullHash="true" :hash='parsedTransactionData.args[index]' /></span>
                <span v-else>{{ formatResponse(parsedTransactionData.args[index]) }}</span>
            </div>
        </div>
         <div v-else>
            <i>Upload contract artifact <router-link :to="`/address/${this.to}?tab=contract`">here</router-link> to decode function parameters.</i>
        </div>
    </div>
</template>
<script>
import { ethers } from 'ethers';
import { formatResponse } from '@/lib/utils';
import HashLink from './HashLink';

export default {
    name: 'TransactionFunctionCall',
    props: ['data', 'value', 'abi', 'to'],
    components: {
        HashLink
    },
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
        formatResponse: formatResponse,
        getSignatureFromFragment: function(fragment) {
            if (!fragment.inputs.length) return;
            return `${fragment.name}(` + fragment.inputs.map((input) => `${input.type} ${input.name}`).join(', ') + ')'
        }
    }
}
</script>
