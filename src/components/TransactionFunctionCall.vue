<template>
    <v-card class="text-medium-emphasis">
        <v-card-text v-if="parsedTransactionData">
            {{ `${parsedTransactionData.functionFragment.name}(\n` }}
            <div class="ml-4" style="white-space: pre;" v-for="(input, index) in parsedTransactionData.functionFragment.inputs" :key="index">
                <Formatted-Sol-Var :input="input" :value="parsedTransactionData.args[index]" />
            </div>
            )
        </v-card-text>
         <v-card-text v-else style="max-height: 250px; overflow-y: scroll; overflow-x: hidden;">
            <div style="float: right;">
                <a :class="{ underlined: displayUtf8Data }" @click="switchDataFormatting('hex')">Hex</a> | <a :class="{ underlined: !displayUtf8Data }" @click="switchDataFormatting('utf8')">UTF-8</a>
            </div>
            <b>Signature:</b> {{ sigHash }}<br>
            <b>Data:</b> {{ convertedData }}
        </v-card-text>
    </v-card>
</template>
<script>
import { ethers } from 'ethers';
const web3 = require('web3');
import { findAbiForFunction } from '@/lib/abi';
import FormattedSolVar from './FormattedSolVar';

export default {
    name: 'TransactionFunctionCall',
    props: ['data', 'value', 'abi', 'to'],
    components: {
        FormattedSolVar
    },
    data: () => ({
        parsedTransactionData: null,
        displayUtf8Data: false
    }),
    mounted: function() {
        const contractAbi = this.abi ? this.abi : findAbiForFunction(this.data.slice(0, 10));

        if (contractAbi) {
            const jsonInterface = new ethers.utils.Interface(contractAbi);
            this.parsedTransactionData = jsonInterface.parseTransaction({ data: this.data, value: this.value });
        }
    },
    methods: {
        switchDataFormatting(formatting) {
            this.displayUtf8Data = formatting == 'utf8';
        },
        getSignatureFromFragment: function(fragment) {
            if (!fragment.inputs.length)
                return `${fragment.name}()`;
            else
                return `${fragment.name}(` + fragment.inputs.map((input) => `${input.type} ${input.name}`).join(', ') + ')'
        }
    },
    computed: {
        sigHash() { return this.data && this.data != '0x' ? this.data.slice(0, 10) : null },
        convertedData() {
            return this.displayUtf8Data ? web3.utils.hexToAscii(this.data) : this.data;
        },
    }
}
</script>
<style scoped>
.underlined {
    text-decoration: underline;
}
.v-card-text {
    line-height: 1.375rem;
}
</style>
