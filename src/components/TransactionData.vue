<template>
    <div v-if="transaction && transaction.hash">
        <div class="text-right" v-if="!withoutStorageHeader && false">
            <router-link :to="`/transaction/${transaction.hash}`">{{ transaction.hash.slice(0, 15) }}...</router-link>
            <v-divider vertical class="mx-2"></v-divider>
            <router-link :to="`/block/${transaction.blockNumber}`">{{ transaction.blockNumber }}</router-link>
            <v-divider vertical class="ml-2"></v-divider>
            <v-btn @click="reload" icon variant="text" class="text-primary">
                <v-icon size="small" class="link">mdi-reload</v-icon>
            </v-btn>
        </div>
        <template v-if="transaction.storage && Object.keys(transaction.storage).length > 0">
            <h4>Storage</h4>
            <v-card>
                <v-card-text>
                    <pre>{{ transaction.storage }}</pre>
                </v-card-text>
            </v-card>
        </template>
        <v-row class="my-2" v-if="transaction.to">
            <v-col>
                <h3 class="mb-2">Called Function</h3>
                <Transaction-Function-Call :data="transaction.data" :value="transaction.value" :abi="transaction.contract && transaction.contract.abi" :to="transaction.to" />
            </v-col>
        </v-row>
        <v-row class="my-2" v-else>
            <v-col>
                <h3 class="mb-2">Contract Creation Data</h3>
                <v-textarea density="compact" variant="outlined" disabled :model-value="transaction.data"></v-textarea>
            </v-col>
        </v-row>
        <v-row class="my-2" v-if="logs.length > 0">
            <v-col>
                <h3 class="mb-2">Emitted Events</h3>
                <template v-if="!transactionLogLoading">
                    <v-card class="my-2" v-for="log in logs" :key="log.id">
                        <v-card-text>
                            <Transaction-Event :log="log" />
                        </v-card-text>
                    </v-card>
                </template>
                <v-card v-else>
                    <v-card-text>
                        <v-skeleton-loader type="list-item-three-line"></v-skeleton-loader>
                    </v-card-text>
                </v-card>
                <v-pagination v-if="logCount > 20"
                    v-model="page"
                    :length="logCount"
                    :total-visible="7"
                    @update:model-value="pageChanged">
                </v-pagination>
            </v-col>
        </v-row>
    </div>
    <div v-else>
        <i>Select a transaction.</i>
    </div>
</template>
<script>
import TransactionFunctionCall from './TransactionFunctionCall.vue';
import TransactionEvent from './TransactionEvent.vue';

export default {
    name: 'TransactionData',
    props: ['transaction', 'abi', 'withoutStorageHeader'],
    components: {
        TransactionFunctionCall,
        TransactionEvent
    },
    data: () => ({
        page: 1,
        transactionLogLoading: true,
        currentOptions: { page: 1, itemsPerPage: 20 },
        logs: [],
        logCount: 0
    }),
    mounted() {
        this.loadTransactionLogs();
    },
    methods: {
        reload() {
            if (this.transaction.blockNumber)
                this.$emit('decodeTx', this.transaction);
        },
        pageChanged(newPage) {
            this.currentOptions = { ...this.currentOptions, page: newPage };
            this.loadTransactionLogs();
        },
        loadTransactionLogs() {
            this.transactionLogLoading = true;
            this.$server.getTransactionLogs(this.transaction.hash, this.currentOptions)
                .then(({ data: { logs, count } }) => {
                    this.logs = logs;
                    this.logCount = count;
                })
                .catch(console.log)
                .finally(() => this.transactionLogLoading = false);
        }
    }
}
</script>
<style scoped>
    .v-textarea {
        font-size: 13px;
    }
</style>
