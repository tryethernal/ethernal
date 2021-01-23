<template>
    <div class="pa-2 grey lighten-3">
        <div v-if="jsonInterface">
            <div class="mb-2">
                Function: {{ getSignatureFromFragment(parsedTransactionData.functionFragment) }}
            </div>
            Params:
            <div v-for="(input, index) in parsedTransactionData.functionFragment.inputs" :key="index">
                {{ input.name }}: {{ parsedTransactionData.args[index] }}
            </div>
        </div>
        <div v-else>
            <i>Upload contract artifact <router-link :to="`/address/${transaction.to}`">here</router-link> to read function data</i>
        </div>
    </div>
</template>
<script>
export default {
    name: 'TransactionData',
    props: ['jsonInterface', 'transaction'],
    data: () => ({
        parsedTransactionData: {
            functionFragment: {
                inputs: []
            }
        }
    }),
    mounted: function() {
        if (this.jsonInterface) {
            this.parsedTransactionData = this.jsonInterface.parseTransaction({data: this.transaction.input, value: this.transaction.value});
        }
    },
    watch: {
        jsonInterface: function() {
            this.parsedTransactionData = this.jsonInterface.parseTransaction({data: this.transaction.input, value: this.transaction.value});
        }
    },
    methods: {
        getSignatureFromFragment: function(fragment) {
            return `${fragment.name}(` + fragment.inputs.map((input) => `${input.type} ${input.name}`).join(', ') + ')'
        }
    }
}
</script>