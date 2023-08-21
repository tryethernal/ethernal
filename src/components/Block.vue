<template>
    <v-container fluid>
        <v-row>
            <v-col cols="6">
                <v-alert dense text type="warning" class="my-2" v-show="syncing">
                    Some transactions in this block are still being processed ({{ block.syncedTransactionCount }} / {{ block.transactionsCount }}).
                </v-alert>
                <h2>Block {{ block.number }}</h2>
            </v-col>
        </v-row>
        <v-row class="mb-4">
            <v-col lg="2" md="12" sm="12">
                <v-subheader class="text-overline">Gas Limit</v-subheader>
                {{ parseInt(block.gasLimit).toLocaleString() }}
            </v-col>
            <v-divider vertical></v-divider>
            <v-col lg="2" md="12" sm="12">
                <v-subheader class="text-overline">Mined On</v-subheader>
                {{ moment(block.timestamp) | moment('MM/DD h:mm:ss A') }}<br>
                <small>{{ moment(block.timestamp).fromNow() }}</small>
            </v-col>
            <v-divider vertical></v-divider>
            <v-col lg="8" md="12" sm="12">
                <v-subheader class="text-overline">Hash</v-subheader>
                <span style="overflow-wrap: break-word;">{{ block.hash }}</span>
            </v-col>
        </v-row>
        <h4>Transactions</h4>
        <v-card outlined>
            <Transactions-List @listUpdated="loadBlock(number)" :blockNumber="number" />
        </v-card>
    </v-container>
</template>

<script>
const moment = require('moment');
import TransactionsList from './TransactionsList';

export default {
    name: 'Block',
    props: ['number'],
    components: {
        TransactionsList
    },
    data: () => ({
        block: {
            gasLimit: 0
        },
        pusherChannelHandler: null
    }),
    mounted() {
        this.pusherChannelHandler = this.pusher.onNewBlock(data => {
            if (data.number == this.number)
                this.loadBlock(this.number);
        }, this);
    },
    destroy() {
        this.pusherChannelHandler.unbind(null, null, this);
    },
    methods: {
        moment: moment,
        loadBlock(number) {
            this.server.getBlock(number)
                .then(({ data }) => this.block = data)
                .catch(console.log);
        }
    },
    computed: {
        syncing() {
            return this.block && this.block.syncedTransactionCount < this.block.transactionsCount;
        }
    },
    watch: {
        number: {
            immediate: true,
            handler(number) { this.loadBlock(number); }
        }
    }
}
</script>
