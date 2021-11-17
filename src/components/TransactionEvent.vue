<template>
    <v-card outlined class="my-2">
        <v-card-text v-if="parsedLog">
            <span v-if="parsedLog.args.length > 0">{{ `${ contract.name }.${parsedLog.name}(\n` }}</span>
            <span v-else>{{ `${ contract.name }.${parsedLog.name}` }}()</span>
            <div v-for="(input, index) in parsedLog.eventFragment.inputs" :key="index">
                <Formatted-Sol-Var :input="input" :value="parsedLog.args[index]" class="ml-4" />
            </div>
            <span v-if="parsedLog.args.length > 0">{{ ')' }}</span>
        </v-card-text>
        <v-card-text v-else>
            <i>Upload contract artifact <router-link :to="`/address/${log.address}?tab=contract`">here</router-link> to decode events data.</i>
        </v-card-text>
    </v-card>
</template>
<script>
import { decodeLog } from '@/lib/abi';
import FormattedSolVar from './FormattedSolVar';

export default {
    name: 'TransactionEvent',
    props: ['log'],
    components: {
        FormattedSolVar
    },
    data: () => ({
        parsedLog: null,
        contract: null
    }),
    mounted: function() {
        this.$bind('contract', this.db.collection('contracts').doc(this.log.address.toLowerCase()))
            .then(() => {
                this.parsedLog = decodeLog(this.log, this.contract.abi);
            });
    }
}
</script>
