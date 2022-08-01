<template>
    <v-container fluid>
        <v-data-table
            :loading="loading"
            :items="blocks"
            :sort-by="currentOptions.sortBy[0]"
            :must-sort="true"
            :sort-desc="true"
            :server-items-length="blockCount"
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
                {{ parseInt(item.timestamp) | moment('YYYY-MM-DD h:mm:ss A') }}
            </template>
            <template v-slot:item.gasUsed="{ item }">
                {{ item.gasUsed.toLocaleString()  }}
            </template>
            <template v-slot:item.transactionNumber="{ item }">
                {{ item.transactionsCount  }} {{ item.transactionsCount != 1 ? 'transactions' : 'transaction' }}
            </template>
        </v-data-table>
    </v-container>
</template>

<script>
export default {
    name: 'Blocks',
    data: () => ({
        blocks: [],
        blockCount: 0,
        headers: [
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
        ],
        loading: true,
        currentOptions: { page: 1, itemsPerPage: 10, sortBy: ['number'], sortDesc: [true] }
    }),
    mounted: function() {
        this.pusher.onNewBlock(() => this.getBlocks(this.currentOptions), this);
    },
    methods: {
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
