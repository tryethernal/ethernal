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
import { ethers } from 'ethers';

export default {
    name: 'TransactionEvent',
    props: ['log', 'abi'],
    data: () => ({
        parsedLog: null
    }),
    mounted: function() {
        if (this.abi) {
            const jsonInterface = new ethers.utils.Interface(this.abi);
            this.parsedLog = jsonInterface.parseLog(this.log);
        }
    },
    methods: {
        getSignatureFromFragment: function(fragment) {
            return `${fragment.name}(` + fragment.inputs.map((input) => `${input.type} ${input.name}`).join(', ') + ')'
        }
    }
}
</script>
