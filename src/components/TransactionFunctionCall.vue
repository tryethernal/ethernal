<template>
    <v-card outlined class="my-2">
        <v-card-text v-if="parsedTransactionData">
            {{ `${parsedTransactionData.functionFragment.name}(\n` }}
            <div v-for="(input, index) in parsedTransactionData.functionFragment.inputs" :key="index">
                <Formatted-Sol-Var :input="input" :value="parsedTransactionData.args[index]" class="ml-4" />
            </div>
            )
        </v-card-text>
         <v-card-text v-else>
            <i>Upload contract artifact <router-link :to="`/address/${this.to}?tab=contract`">here</router-link> to decode function parameters.</i>
        </v-card-text>
    </v-card>
</template>
<script>
import { ethers } from 'ethers';
import { formatResponse } from '@/lib/utils';
import FormattedSolVar from './FormattedSolVar';

export default {
    name: 'TransactionFunctionCall',
    props: ['data', 'value', 'abi', 'to'],
    components: {
        FormattedSolVar
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
            if (!fragment.inputs.length)
                return `${fragment.name}()`;
            else
                return `${fragment.name}(` + fragment.inputs.map((input) => `${input.type} ${input.name}`).join(', ') + ')'
        }
    }
}
</script>
