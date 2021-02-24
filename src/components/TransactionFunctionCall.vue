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
            <i>Upload contract artifact <router-link :to="`/address/${this.transaction.to}`">here</router-link> to decode function parameters.</i>
        </div>
    </div>
</template>
<script>
export default {
    name: 'TransactionFunctionCall',
    props: ['jsonInterface', 'transaction'],
    data: () => ({
        parsedTransactionData: {
            functionFragment: {
                inputs: []
            }
        }
    }),
    watch: {
        jsonInterface: function(jsonInterface) {
            this.parsedTransactionData = jsonInterface.parseTransaction({ data: this.transaction.input, value: this.transaction.value });
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
