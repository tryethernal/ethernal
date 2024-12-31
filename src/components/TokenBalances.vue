<template>
    <v-card border flat>
        <v-card-text>
            <v-data-table
                :loading="loading"
                :items="balances"
                :sort-by="[{ key: 'currentBalance', order: 'desc' }]"
                :headers="headers">
            <template v-slot:top v-if="!dense">
                <div class="d-flex justify-end">
                    <v-switch hide-details="auto" v-model="unformatted" label="Unformatted Balances"></v-switch>
                </div>
            </template>
            <template v-slot:item.token="{ item }">
                <Hash-Link :type="'address'" :hash="item.token" :withName="true" :withTokenName="true" :contract="item.tokenContract" />
            </template>
            <template v-slot:item.currentBalance="{ item }">
                {{ $fromWei(item.currentBalance, item.tokenContract && item.tokenContract.tokenDecimals, item.tokenContract && item.tokenContract.tokenSymbol, unformatted) }}
            </template>
            </v-data-table>
        </v-card-text>
    </v-card>
</template>
<script>
import HashLink from './HashLink.vue';
import FromWei from '../filters/FromWei.js';

export default {
    name: 'TokenBalances',
    props: ['address', 'patterns', 'dense'],
    components: {
        HashLink
    },
    filters: {
        FromWei
    },
    data: () => ({
        unformatted: false,
        loading: false,
        balances: [],
        headers: [
            { text: 'Token', value: 'token' },
            { text: 'Balance', value: 'currentBalance' }
        ]
    }),
    mounted() {
        this.getTokenBalances();
    },
    methods: {
        getTokenBalances() {
            this.loading = true;
            this.$server.getTokenBalances(this.address, this.patterns)
                .then(({ data }) => this.balances = data)
                .catch(console.log)
                .finally(() => this.loading = false);
        }
    },
    watch: {
        address: {
            immediate: true,
            handler() {
                this.getTokenBalances();
            }
        }
    }
}
</script>
