<template>
    <v-data-table
        dense
        :loading="loading"
        :items="blocks"
        :sort-by="currentOptions.sortBy[0]"
        :must-sort="true"
        :sort-desc="true"
        :server-items-length="blockCount"
        :hide-default-footer="dense"
        :hide-default-header="dense"
        :footer-props="{
            itemsPerPageOptions: [10, 25, 100]
        }"
        :headers="headers"
        @update:options="getBlocks">
        <template v-slot:no-data>
            No blocks found
        </template>
        <template v-slot:item.number="{ item }">
            <router-link :to="'/block/' + item.number">{{item.number}}</router-link>
        </template>
        <template v-slot:item.timestamp="{ item }">
            <div class="my-2 text-left">
                {{ moment(item.timestamp) | moment('MM/DD h:mm:ss A') }}<br>
                <small>{{ moment(item.timestamp).fromNow() }}</small>
            </div>
        </template>
        <template v-slot:item.gasUsed="{ item }">
            {{ item.gasUsed.toLocaleString()  }}
        </template>
        <template v-slot:item.transactionNumber="{ item }">
            {{ item.transactionsCount  }} {{ item.transactionsCount != 1 ? 'transactions' : 'transaction' }}
        </template>
    </v-data-table>
</template>

<script>
const moment = require('moment');
export default {
    name: 'BlockList',
    props: ['dense'],
    data: () => ({
        blocks: [],
        blockCount: 0,
        headers: [],
        loading: true,
        currentOptions: { page: 1, itemsPerPage: 10, sortBy: ['number'], sortDesc: [true] }
    }),
    mounted: function() {
        this.pusher.onNewBlock(() => this.getBlocks(this.currentOptions), this);
        if (this.dense) {
            this.headers = [
                {
                    text: 'Block',
                    value: 'number'
                },
                {
                    text: 'Mined On',
                    value: 'timestamp'
                },
                {
                    text: 'Transaction Count',
                    value: 'transactionNumber',
                    sortable: false
                }
            ]
        }
        else {
            this.headers = [
                {
                    text: 'Block',
                    value: 'number'
                },
                {
                    text: 'Mined On',
                    value: 'timestamp'
                },
                {
                    text: 'Gas Used',
                    value: 'gasUsed',
                    sortable: false
                },
                {
                    text: 'Transaction Count',
                    value: 'transactionNumber',
                    sortable: false
                }
            ]
        }
    },
    methods: {
        moment: moment,
        getBlocks: function(newOptions) {
            this.loading = true;

            if (newOptions)
                this.currentOptions = newOptions;

            const options = {
                page: this.currentOptions.page,
                itemsPerPage: this.currentOptions.itemsPerPage,
                order: this.currentOptions.sortDesc[0] === false ? 'asc' : 'desc'
            };
            this.server.getBlocks(options)
                .then(({ data }) => {
                    this.blocks = data.items;
                    this.blockCount = data.total;
                })
                .catch(console.log)
                .finally(() => this.loading = false);
        }
    }
}
</script>
