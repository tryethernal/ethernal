<template>
    <v-card outlined class="my-2">
        <v-card-text v-if="parsedLog">
            <span v-if="parsedLog.args.length > 0"><Hash-Link :type="'address'" :notCopiable="true" :withName="true" :hash="this.log.address" />{{ `.${parsedLog.name}(\n` }}</span>
            <span v-else>{{ `${ contract.name }.${parsedLog.name}` }}()</span>
            <div style="white-space: pre;" v-for="(input, index) in parsedLog.eventFragment.inputs" :key="index">
                <Formatted-Sol-Var :input="input" :value="parsedLog.args[index]" class="ml-4" />
            </div>
            <span v-if="parsedLog.args.length > 0">{{ ')' }}</span>
        </v-card-text>
        <v-card-text v-else>
            <b>Emitter:</b> <Hash-Link :type="'address'" :hash="log.address"></Hash-Link><br>
            <b>Topics:</b>
            <ul>
                <li v-for="(topic, idx) in log.topics" :key="idx">{{ topic }}</li>
            </ul>
            <b>Data:</b> {{ log.data }}
        </v-card-text>
    </v-card>
</template>
<script>
import { decodeLog } from '@/lib/abi';
import FormattedSolVar from './FormattedSolVar';
import HashLink from './HashLink';

export default {
    name: 'TransactionEvent',
    props: ['log'],
    components: {
        FormattedSolVar,
        HashLink
    },
    data: () => ({
        parsedLog: null,
        contract: null
    }),
    mounted: function() {
        this.server.getContract(this.log.address)
            .then(({ data }) => {
                if (data) {
                    this.contract = data.proxyContract || data;
                    if (this.contract && this.contract.abi)
                        this.parsedLog = decodeLog(this.log, this.contract.abi);
                }
            });
    }
}
</script>
