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
        :disable-pagination="true"
        :hide-default-header="dense"
        :item-class="rowClasses"
        :footer-props="{
            itemsPerPageOptions: [10, 25, 100],
        }"
        :headers="headers"
        @update:options="getBlocks">
        <template v-if="!withCount" v-slot:[`footer.page-text`]=""></template>
        <template v-slot:no-data>
            No blocks found
        </template>Jul 26 2022, 4:49 PM
        <template v-slot:item.number="{ item }">
            <template>
                <v-tooltip top>
                    <template v-slot:activator="{ on, attrs }">
                        <v-progress-circular v-if="item.state == 'syncing'" v-bind="attrs" v-on="on" size="16" width="2" indeterminate color="primary" class="mr-2"></v-progress-circular>
                    </template>
                    <span v-if="item.state == 'syncing'">Indexing block...</span>
                </v-tooltip>
            </template>
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
    props: ['dense', 'withCount'],
    data: () => ({
        blocks: [],
        blockCount: 0,
        headers: [],
        loading: true,
        currentOptions: { page: 1, itemsPerPage: 10, sortBy: ['number'], sortDesc: [true] },
        pusherChannelHandler: null
    }),
    mounted() {
        this.pusherChannelHandler = this.pusher.onNewBlock(() => this.getBlocks(this.currentOptions), this);

        this.headers.push(
            { text: 'Block', value: 'number' },
            { text: 'Mined On', value: 'timestamp' }
        );
        if (!this.dense)
            this.headers.push({ text: 'Gas Used', value: 'gasUsed', sortable: false });
        this.headers.push({ text: 'Transaction Count', value: 'transactionNumber', sortable: false });
    },
    destroyed() {
        this.pusherChannelHandler.unbind(null, null, this);
    },
    methods: {
        moment: moment,
        rowClasses(item) {
            if (item.state == 'syncing')
                return 'isSyncing'
        },
        getBlocks(newOptions) {
            this.loading = true;

            if (newOptions)
                this.currentOptions = newOptions;

            const options = {
                page: this.currentOptions.page,
                itemsPerPage: this.currentOptions.itemsPerPage,
                order: this.currentOptions.sortDesc[0] === false ? 'asc' : 'desc'
            };
            this.server.getBlocks(options, !this.dense || !!this.withCount)
                .then(({ data }) => {
                    this.blocks = data.items;
                    this.blockCount = data.items.length == this.currentOptions.itemsPerPage ?
                        (this.currentOptions.page * data.items.length) + 1 :
                        this.currentOptions.page * data.items.length;
                })
                .catch(console.log)
                .finally(() => this.loading = false);
        }
    }
}
</script>
<style scoped>
/deep/ .isSyncing {
    font-style: italic;
    opacity: 0.7;
}
</style>
