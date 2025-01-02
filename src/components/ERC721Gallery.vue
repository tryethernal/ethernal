<template>
    <v-container fluid>
        <template v-if="!totalSupply || totalSupply > 0">
            <v-row>
                <v-col v-if="loading">
                    <v-card>
                        <v-skeleton-loader type="list-item"></v-skeleton-loader>
                    </v-card>
                </v-col>
                <v-col cols="6" sm="4" lg="2" v-for="idx in tokens" :key="idx">
                    <ERC721-Token-Card
                        :index="idx"
                        :contractAddress="address"></ERC721-Token-Card>
                </v-col>
            </v-row>
            <v-row>
                <v-col>
                    <v-pagination
                        v-model="page"
                        :length="length"
                        :total-visible="7"
                        @update:model-value="pageChanged">
                    </v-pagination>
                </v-col>
            </v-row>
        </template>
        <template v-if="totalSupply === '0'">
            <v-row>
                <v-col>
                    <v-card>
                        <v-card-text>There are no tokens in this collection, or the contract is missing the totalSupply() method.</v-card-text>
                    </v-card>
                </v-col>
            </v-row>
        </template>
    </v-container>
</template>

<script>
import ERC721TokenCard from './ERC721TokenCard';

export default {
    name: 'ERC721Gallery',
    props: ['address'],
    components: {
        ERC721TokenCard
    },
    data: () => ({
        loading: false,
        page: 1,
        tokens: [],
        currentOptions: { page: 1, itemsPerPage: 12, sortBy: ['index'], order: 'asc' },
        erc721Connector: null,
        totalSupply: null
    }),
    mounted() {
        this.loading = true;
        this.$server.getErc721TotalSupply(this.address)
            .then(({ data: { totalSupply }}) => {
                this.totalSupply = totalSupply;
                if (this.totalSupply)
                    this.getTokens();
            })
            .catch(console.log)
            .finally(() => this.loading = false);
    },
    methods: {
        pageChanged(newPage) {
            this.currentOptions = { ...this.currentOptions, page: newPage };
            this.getTokens();
        },
        getTokens() {
            this.tokens = Array.from({ length: Math.min(this.currentOptions.itemsPerPage, this.totalSupply) }, (_, i) => this.currentOptions.itemsPerPage * (this.currentOptions.page - 1) + i);
        }
    },
    computed: {
        length() {
            return this.totalSupply ? Math.ceil(this.totalSupply / this.currentOptions.itemsPerPage) : 0;
        }
    }
}
</script>
