<template>
    <div class="pa-2 grey lighten-3">
        <div v-if="jsonInterface">
            <div class="mb-2">
                Name: {{ getSignatureFromFragment(parsedLog.eventFragment) }}
            </div>
            Data:
            <div v-for="(input, index) in parsedLog.eventFragment.inputs" :key="index">
                {{ input.name }}: {{ parsedLog.args[index] }}
            </div>
        </div>
        <div v-else>
            <i>Upload contract artifact <router-link :to="`/address/${log.address}`">here</router-link> to read events data</i>
        </div>
    </div>
</template>
<script>
export default {
    name: 'TransactionData',
    props: ['jsonInterface', 'log'],
    data: () => ({
        parsedLog: {
            eventFragment: {
                inputs: []
            },
        }
    }),
    watch: {
        jsonInterface: function() {
            this.parsedLog = this.jsonInterface.parseLog(this.log);    
        }
    },
    methods: {
        getSignatureFromFragment: function(fragment) {
            return `${fragment.name}(` + fragment.inputs.map((input) => `${input.type} ${input.name}`).join(', ') + ')'
        }
    }
}
</script>