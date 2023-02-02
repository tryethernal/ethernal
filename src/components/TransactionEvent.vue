<template>
    <div v-if="short" class="my-3">
        <v-tooltip top :open-delay="150" color="grey darken-1" content-class="tooltip">
            <template v-slot:activator="{ on, attrs }">
                <v-chip class="primary lighten-1" v-bind="attrs" v-on="on" label small>
                    <span class="color--text event-name">{{ eventLabel }}</span>
                </v-chip>
            </template>
            <span style="white-space: pre">
                <template v-if="parsedLog">
                    <span v-if="parsedLog.args.length > 0"><Hash-Link :type="'address'" :unlink="true" :notCopiable="true" :withTokenName="true" :withName="true" :hash="this.log.address" />{{ `.${parsedLog.name}(\n` }}</span>
                    <span v-else>{{ `${ contract.name }.${parsedLog.name}` }}()</span>
                    <div style="white-space: pre;" v-for="(input, index) in parsedLog.eventFragment.inputs" :key="index">
                        <Formatted-Sol-Var :notInteractive="true" :input="input" :value="parsedLog.args[index]" class="ml-4" />
                    </div>
                    <span v-if="parsedLog.args.length > 0">{{ ')' }}</span>
                </template>
                <template v-else>
                    <b>Emitter:</b> <Hash-Link :unlink="true" :notCopiable="true" :type="'address'" :hash="log.address"></Hash-Link><br>
                    <b>Topics:</b>
                    <ul>
                        <li v-for="(topic, idx) in log.topics" :key="idx">{{ topic }}</li>
                    </ul>
                    <div class="log-data"><b>Data:</b> {{ log.data }}</div>
                </template>
            </span>
        </v-tooltip>
    </div>
    <div v-else class="my-3">
        <template v-if="parsedLog">
            <span v-if="parsedLog.args.length > 0"><Hash-Link :type="'address'" :notCopiable="true" :withTokenName="true" :withName="true" :hash="this.log.address" />{{ `.${parsedLog.name}(\n` }}</span>
            <span v-else>{{ `${ contract.name }.${parsedLog.name}` }}()</span>
            <div style="white-space: pre;" v-for="(input, index) in parsedLog.eventFragment.inputs" :key="index">
                <Formatted-Sol-Var :input="input" :value="parsedLog.args[index]" class="ml-4" />
            </div>
            <span v-if="parsedLog.args.length > 0">{{ ')' }}</span>
        </template>
        <template v-else>
            <b>Emitter:</b> <Hash-Link :type="'address'" :hash="log.address"></Hash-Link><br>
            <b>Topics:</b>
            <ul>
                <li v-for="(topic, idx) in log.topics" :key="idx">{{ topic }}</li>
            </ul>
            <div class="log-data"><b>Data:</b> {{ log.data }}</div>
        </template>
    </div>
</template>
<script>
import { findAbiForEvent, decodeLog } from '@/lib/abi';
import FormattedSolVar from './FormattedSolVar';
import HashLink from './HashLink';

export default {
    name: 'TransactionEvent',
    props: ['log', 'short'],
    components: {
        FormattedSolVar,
        HashLink
    },
    data: () => ({
        parsedLog: null,
        contract: null
    }),
    mounted() {
        if (this.log.contract && this.log.contract.abi) {
            this.parsedLog = decodeLog(this.log, this.log.contract.abi);
        }
        else {
            const abi = findAbiForEvent(this.log.topics[0]);
            if (abi)
                this.parsedLog = decodeLog(this.log, abi);
        }

        if (this.parsedLog) return;

        this.server.getContract(this.log.address)
            .then(({ data }) => {
                if (data) {
                    this.contract = data.proxyContract || data;
                    if (this.contract && this.contract.abi) {
                        this.parsedLog = decodeLog(this.log, this.contract.abi);
                        return;
                    }
                }
            });
    },
    computed: {
        eventLabel() {
            return this.parsedLog && this.parsedLog.name || this.log.topics[0];
        }
    }
}
</script>
<style scoped>
.log-data {
    max-width: 71ch;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
}

.event-name {
    display: block;
    max-width: 11ch;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.tooltip {
    opacity: 1!important;
}
</style>
