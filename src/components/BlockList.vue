<template>
    <v-data-table-server
        class="hide-table-count"
        :loading="loading"
        :items="blocks"
        :items-length="blockCount"
        :sort-by="currentOptions.sortBy"
        :must-sort="true"
        :hide-default-footer="dense"
        :disable-pagination="true"
        :hide-default-header="dense"
        :item-class="rowClasses"
        items-per-page-text="Rows per page:"
        no-data-text="No blocks indexed yet"
        last-icon=""
        first-icon=""
        :items-per-page-options="[
            { value: 10, title: '10' },
            { value: 25, title: '25' },
            { value: 100, title: '100' }
        ]"
        :headers="headers"
        @update:options="getBlocks">
        <template v-if="!withCount" v-slot:[`footer.page-text`]=""></template>
        <template v-slot:item.number="{ item }">
            <v-tooltip location="top">
                <template v-slot:activator="{ props }">
                    <v-progress-circular v-if="item.state == 'syncing'" v-bind="props" size="16" width="2" indeterminate color="primary" class="mr-2"></v-progress-circular>
                </template>
                <span v-if="item.state == 'syncing'">Indexing block...</span>
            </v-tooltip>
            <router-link style="text-decoration: none;" :to="'/block/' + item.number">{{ commify(item.number) }}</router-link>
        </template>
        <template v-slot:item.timestamp="{ item }">
            <div class="my-2 text-left">
                {{ $dt.shortDate(item.timestamp) }}<br>
                <small>{{ $dt.fromNow(item.timestamp) }}</small>
            </div>
        </template>
        <template v-slot:item.gasUsed="{ item }">
            {{ commify(item.gasUsed)  }}
        </template>
        <template v-slot:item.transactionNumber="{ item }">
            {{ item.transactionsCount  }} {{ item.transactionsCount != 1 ? 'transactions' : 'transaction' }}
        </template>
    </v-data-table-server>
</template>

<script>
const ethers = require('ethers');

export default {
    name: 'BlockList',
    props: ['dense', 'withCount'],
    data: () => ({
        blocks: [],
        blockCount: 0,
        headers: [],
        loading: true,
        currentOptions: { page: 1, itemsPerPage: 10, sortBy: [{ key: 'number', order: 'desc' }] },
        pusherChannelHandler: null
    }),
    mounted() {
        this.pusherChannelHandler = this.$pusher.onNewBlock(() => this.getBlocks(this.currentOptions), this);

        this.headers.push(
            { title: 'Block', key: 'number' },
            { title: 'Mined On', key: 'timestamp' }
        );
        if (!this.dense)
            this.headers.push({ title: 'Gas Used', key: 'gasUsed', sortable: false });
        this.headers.push({ title: 'Transaction Count', key: 'transactionNumber', sortable: false });
    },
    destroyed() {
        this.pusherChannelHandler.unbind();
        this.pusherChannelHandler = null;
    },
    methods: {
        commify: ethers.utils.commify,
        rowClasses(item) {
            if (item.state == 'syncing')
                return 'isSyncing'
        },
        getBlocks({ page, itemsPerPage, sortBy } = {}) {
            this.loading = true;

            if (!page || !itemsPerPage || !sortBy || !sortBy.length)
                return this.loading = false;

            this.currentOptions = {
                page,
                itemsPerPage,
                sortBy
            };

            this.$server.getBlocks({ page, itemsPerPage, orderBy: sortBy[0].key, order: sortBy[0].order }, !this.dense && !!this.withCount)
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
