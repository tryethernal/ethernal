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
            @update:options="fetchBlocks">
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
                <span v-if="item.transactions">
                    {{ item.transactions.length  }} {{ item.transactions.length != 1 ? 'transactions' : 'transaction' }}
                </span>
                <span v-else>
                    0 transactions
                </span>
            </template>
        </v-data-table>
    </v-container>
</template>

<script>
import { mapGetters } from 'vuex';
const axios = require('axios');
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
        this.fetchBlocks(this.currentOptions);
    },
    methods: {
        fetchBlocks: function(options) {
            this.loading = true;
            this.currentOptions = options;
            const sortDirection = this.currentOptions.sortDesc[0] === false ? 'asc' : 'desc';
            axios.get(`http://localhost:8888/api/blocks?firebaseAuthToken=${this.firebaseIdToken}&firebaseUserId=${this.currentWorkspace.userId}&workspace=${this.currentWorkspace.name}&page=${this.currentOptions.page}&itemsPerPage=${this.currentOptions.itemsPerPage}&order=${sortDirection}`)
                .then(({ data }) => {
                    this.blocks = data.items;
                    this.blockCount = data.total;
                })
                .catch(console.log)
                .finally(() => this.loading = false);
        },
        serializer: function(snapshot) {
            if (snapshot.data().transactions === undefined)
                return Object.defineProperty(snapshot.data(), 'transactions', { value: [] })
            else
                return snapshot.data();
        }
    },
    computed: {
        ...mapGetters([
            'firebaseIdToken',
            'currentWorkspace'
        ])
    }
}
</script>
