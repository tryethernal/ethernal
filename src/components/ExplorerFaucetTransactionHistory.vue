<template>
    <v-card>
        <v-card-text>
            <v-data-table-server
                class="hide-table-count"
                :loading="loading"
                :items="transactions"
                :items-length="0"
                :sort-by="currentOptions.sortBy"
                :must-sort="true"
                :headers="headers"
                items-per-page-text="Rows per page:"
                no-data-text="No faucet transactions yet"
                last-icon=""
                first-icon=""
                :items-per-page-options="[
                    { value: 10, title: '10' },
                    { value: 25, title: '25' },
                    { value: 100, title: '100' }
                ]"
                item-key="transactionHash"
                @update:options="getTransactions">
                <template v-slot:item.transactionHash="{ item }">
                    <Hash-Link :type="'transaction'" :hash="item.transactionHash" />
                </template>
                <template v-slot:item.createdAt="{ item }">
                    <div class="my-2 text-left">
                        {{ $dt.shortDate(item.createdAt) }}<br>
                        <small>{{ $dt.fromNow(item.createdAt) }}</small>
                    </div>
                </template>
                <template v-slot:item.address="{ item }">
                    <Hash-Link :type="'address'" :hash="item.address" :withTokenName="true" :withName="true" />
                </template>
                <template v-slot:item.amount="{ item }">
                    {{ $fromWei(item.amount, 'ether', tokenSymbol) }}
                </template>
            </v-data-table-server>
        </v-card-text>
    </v-card>
</template>

<script>
import { storeToRefs } from 'pinia';
import { useExplorerStore } from '../stores/explorer';
import HashLink from './HashLink.vue';

export default {
    name: 'ExplorerFaucetTransactionHistory',
    components: {
        HashLink
    },
    data: () => ({
        headers: [
            { title: 'Transaction Hash', key: 'transactionHash', sortable: false },
            { title: 'Timestamp', key: 'createdAt' },
            { title: 'To', key: 'address', sortable: false },
            { title: 'Amount', key: 'amount' }
        ],
        currentOptions: { page: 1, itemsPerPage: 10, sortBy: [{ key: 'timestamp', order: 'desc' }] },
        transactions: [],
        transactionCount: 0,
        loading: false
    }),
    setup() {
        const explorerStore = useExplorerStore();
        const { faucet, token } = storeToRefs(explorerStore);

        return { faucet, token };
    },
    mounted() {
        this.pusherUnsubscribe = this.$pusher.onNewTransaction(transaction => {
            if (this.faucet.address == transaction.from)
                this.getTransactions(this.currentOptions);
        }, this, this.address);

    },
    destroyed() {
        this.pusherUnsubscribe();
    },
    methods: {
        getTransactions({ page, itemsPerPage, sortBy } = {}) {
            this.loading = true;

            if (!page || !itemsPerPage || !sortBy || !sortBy.length)
                return this.loading = false;

            this.currentOptions = {
                page,
                itemsPerPage,
                sortBy
            };

            this.$server.getFaucetTransactionHistory(this.faucet.id, { page, itemsPerPage, orderBy: sortBy[0].key, order: sortBy[0].order })
                .then(({ data }) => {
                    this.transactions = data.transactions;
                    this.transactionCount = data.count;
                })
                .catch(console.log)
                .finally(() => this.loading = false);
        }
    },
    computed: {
        tokenSymbol() {
            return this.token || 'ETH';
        }
    }
}
</script>
