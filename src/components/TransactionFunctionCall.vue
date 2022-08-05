<template>
    <v-card outlined>
        <v-card-text v-if="parsedTransactionData">
            {{ `${parsedTransactionData.functionFragment.name}(\n` }}
            <div class="ml-4" style="white-space: pre;" v-for="(input, index) in parsedTransactionData.functionFragment.inputs" :key="index">
                <Formatted-Sol-Var :input="input" :value="parsedTransactionData.args[index]" />
            </div>
            )
        </v-card-text>
         <v-card-text v-else>
            <b>Signature:</b> {{ sigHash }}<br>
            <b>Data:</b> {{ data }}
        </v-card-text>
    </v-card>
</template>
<script>
import { ethers } from 'ethers';
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
        getSignatureFromFragment: function(fragment) {
            if (!fragment.inputs.length)
                return `${fragment.name}()`;
            else
                return `${fragment.name}(` + fragment.inputs.map((input) => `${input.type} ${input.name}`).join(', ') + ')'
        }
    },
    computed: {
        sigHash: function() { return this.data && this.data != '0x' ? this.data.slice(0, 10) : null }
    }
}
</script>
