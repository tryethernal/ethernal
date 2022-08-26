<template>
    <v-container fluid>
        <v-row>
            <v-col cols="2" v-for="(token, idx) in tokens" :key="idx">
                <ERC721-Token-Card
                    :owner="token.owner"
                    :metadata="token.metadata"
                    :tokenId="token.tokenId"
                    :contractAddress="address" />
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
import ERC721TokenCard from './ERC721TokenCard';

export default {
    name: 'ERC721Collection',
    props: ['address'],
    components: {
        ERC721TokenCard
    },
    data: () => ({
        loading: false,
        tokens: [],
        tokenCount: 0,
        currentOptions: { page: 1, itemsPerPage: 10, sortBy: ['tokenId'], sortDesc: [false] }
    }),
    mounted() {
        this.fetchTokens();
    },
    methods: {
        fetchTokens(newOptions) {
            this.loading = true;

            if (newOptions)
                this.currentOptions = newOptions;

            const options = {
                page: this.currentOptions.page,
                itemsPerPage: this.currentOptions.itemsPerPage,
                order: this.currentOptions.sortDesc[0] === false ? 'asc' : 'desc'
            };

            this.server.getErc721Tokens(this.address, options)
                .then(({ data: { items, total } }) => {
                    this.tokens = items;
                    this.tokenCount = total;
                })
                .catch(console.log)
                .finally(() => this.loading = false);
        }
    }
}
</script>
