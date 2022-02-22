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
            @update:options="onPagination">
            <template v-slot:no-data>
                No blocks found - <a href="https://doc.tryethernal.com/getting-started/cli" target="_blank">Did you set up the CLI?</a>
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
                {{ item.transactions.length  }} {{ item.transactions.length != 1 ? 'transactions' : 'transaction' }}
            </template>
        </v-data-table>
    </v-container>
</template>

<script>
import { mapGetters } from 'vuex';
import { getPaginatedQuery } from '@/lib/utils';
export default {
    name: 'Blocks',
    data: () => ({
        blocks: [],
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
        const sortDirection = this.currentOptions.sortDesc[0] === false ? 'asc' : 'desc';
        this.$bind('blocks',
            this.db.collection('blocks')
                .orderBy(this.currentOptions.sortBy[0], sortDirection)
                .limit(this.currentOptions.itemsPerPage),
                { serialize: this.serializer }
        ).then(() => this.loading = false);
    },
    methods: {
        serializer: function(snapshot) {
            if (snapshot.data().transactions === undefined)
                return Object.defineProperty(snapshot.data(), 'transactions', { value: [] })
            else
                return snapshot.data();
        },
        onPagination: function(options) {
            if (!this.blocks.length) return;
            this.loading = true;
            const query = getPaginatedQuery(
                this.db.collection('blocks'),
                this.blocks,
                this.currentOptions,
                options
            );
            this.$bind('blocks', query, { reset: false }).then(() => this.loading = false);
            this.currentOptions = options;
        }
    },
    computed: {
        ...mapGetters([
            'blockCount'
        ])
    }
}
</script>
