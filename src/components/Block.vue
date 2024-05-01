<template>
    <v-container fluid>
        <v-row>
            <v-col cols="6">
                <v-alert dense text type="warning" class="my-2" v-show="syncing">
                    Some transactions in this block are still being processed ({{ block.syncedTransactionCount }} / {{ block.transactionsCount }}).
                </v-alert>
                <h2>Block {{ block.number && commify(block.number) }}</h2>
            </v-col>
        </v-row>
        <v-row class="mb-4">
            <v-col lg="2" md="12" sm="12">
                <v-subheader class="text-overline">Gas Limit</v-subheader>
                <template v-if="!loading">
                    {{ parseInt(block.gasLimit).toLocaleString() }}
                </template>
                <v-skeleton-loader type="list-item" v-else></v-skeleton-loader>
            </v-col>
            <v-divider vertical></v-divider>
            <v-col lg="2" md="12" sm="12">
                <v-subheader class="text-overline">Mined On</v-subheader>
                <template v-if="!loading">
                    {{ moment(block.timestamp) | moment('MM/DD h:mm:ss A') }}<br>
                    <small>{{ moment(block.timestamp).fromNow() }}</small>
                </template>
                <v-skeleton-loader type="list-item" v-else></v-skeleton-loader>
            </v-col>
            <v-divider vertical></v-divider>
            <v-col lg="4" md="12" sm="12">
                <v-subheader class="text-overline">Hash</v-subheader>
                <template v-if="!loading">
                    <span style="overflow-wrap: break-word;">{{ block.hash }}</span>
                </template>
                <v-skeleton-loader type="list-item" v-else></v-skeleton-loader>
            </v-col>
            <template v-if="publicExplorer && publicExplorer.l1Explorer && block.l1BlockNumber">
                <v-divider vertical></v-divider>
                <v-col lg="2" md="12" sm="12">
                    <v-subheader class="text-overline">L1 Block</v-subheader>
                    <template v-if="!loading">
                        <a :href="`${publicExplorer.l1Explorer}/block/${block.l1BlockNumber}`" target="_blank">{{ commify(block.l1BlockNumber) }}</a>
                    </template>
                    <v-skeleton-loader type="list-item" v-else></v-skeleton-loader>
                </v-col>
            </template>
        </v-row>
        <h4>Transactions</h4>
        <v-card outlined>
            <Transactions-List @listUpdated="loadBlock(number)" :blockNumber="number" :withCount="true" />
        </v-card>
    </v-container>
</template>

<script>
const moment = require('moment');
const ethers = require('ethers');
import { mapGetters } from 'vuex';
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
        pusherChannelHandler: null,
        loading: false
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
        moment,
        commify: ethers.utils.commify,
        loadBlock(number) {
            this.loading = true;
            this.server.getBlock(number)
                .then(({ data }) => this.block = data)
                .catch(console.log)
                .finally(() => this.loading = false);
        }
    },
    computed: {
        ...mapGetters([
            'publicExplorer'
        ]),
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
