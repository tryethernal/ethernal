<template>
    <div class="pa-2 grey lighten-3">
        <div v-if="parsedLog">
            <div class="mb-2">
                Event: {{ getSignatureFromFragment(parsedLog.eventFragment) }}
            </div>
            Data:
            <div v-for="(input, index) in parsedLog.eventFragment.inputs" :key="index">
                {{ input.name }}: {{ parsedLog.args[index] }}
            </div>
        </div>
        <div v-else>
            <i>Upload contract artifact <router-link :to="`/address/${log.address}?tab=contract`">here</router-link> to decode events data.</i>
        </div>
    </div>
</template>
<script>
import { decodeLog } from '../lib/abi';

export default {
    name: 'TransactionEvent',
    props: ['log'],
    data: () => ({
        parsedLog: null,
        contract: null
    }),
    mounted: function() {
        this.$bind('contract', this.db.collection('contracts').doc(this.log.address.toLowerCase()))
            .then(() => this.parsedLog = decodeLog(this.log, this.contract.abi));
    },
    methods: {
        getSignatureFromFragment: function(fragment) {
            return `${fragment.name}(` + fragment.inputs.map((input) => `${input.type} ${input.name}`).join(', ') + ')'
        }
    }
}
</script>
