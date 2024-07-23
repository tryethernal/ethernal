<template>
    <v-card outlined>
        <v-card-title>Pools</v-card-title>
        <v-card-text>
            <v-data-table
                :loading="loading"
                :items="pairs"
                :sort-by="currentOptions.sortBy[0]"
                :must-sort="true"
                :sort-desc="currentOptions.sortDesc[0]"
                :server-items-length="pairCount"
                :headers="headers"
                item-key="id"
                @update:options="getPoolsWithReserves">
                <template v-slot:item.pool="{ item }">
                    {{ item.token0.tokenName }} / {{ item.token1.tokenName }}
                </template>
                <template v-slot:item.liquidity="{ item }">
                    <template v-if="item.poolReserves.length > 0">
                        {{ formattedPoolReserve(item.poolReserves[0].reserve0, item.token0.tokenDecimals) }} {{ item.token0.tokenSymbol }} / {{ formattedPoolReserve(item.poolReserves[0].reserve1, item.token1.tokenDecimals) }} {{ item.token1.tokenSymbol }}
                    </template>
                    <template v-else>
                        No liquidity
                    </template>
                </template>
            </v-data-table>
        </v-card-text>
    </v-card>
</template>

<script>
import { mapGetters } from 'vuex';
import { formatNumber } from '@/lib/utils';

export default {
    name: 'ExplorerDexPools',
    data: () => ({
        pairs: [],
        pairCount: 0,
        headers: [
            { text: 'Pool', value: 'pool', sortable: false },
            { text: 'Liquidity', value: 'liquidity' }
        ],
        loading: false,
        currentOptions: { page: 1, itemsPerPage: 10, sortBy: ['liquidity'], sortDesc: [true] }
    }),
    mounted() {
        this.getPoolsWithReserves();
    },
    methods: {
        getPoolsWithReserves(newOptions) {
            this.loading = true;

            if (newOptions)
                this.currentOptions = newOptions;

            const options = {
                page: this.currentOptions.page,
                itemsPerPage: this.currentOptions.itemsPerPage,
                order: this.currentOptions.sortDesc[0] === false ? 'asc' : 'desc',
                orderBy: this.currentOptions.sortBy[0]
            };

            this.server.getLatestPairsWithReserve(options)
                .then(({ data: { pairs, count }}) => {
                    this.pairs = pairs;
                    this.pairCount = count;
                })
                .catch(console.log)
                .finally(() => this.loading = false);
        },
        formattedPoolReserve(reserve, decimals) {
            return formatNumber(reserve, { short: true, decimals, maximumFractionDigits: 2 });
        },
    },
    computed: {
        ...mapGetters([
            'publicExplorer',
        ]),
    },
};
</script>
