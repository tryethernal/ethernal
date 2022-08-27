<template>
    <v-container fluid>
        <v-row>
            <v-col cols="2" v-for="(token, idx) in tokens" :key="idx">
                <ERC721-Token-Card
                    :owner="token.owner"
                    :name="token.attributes.name"
                    :imageData="token.attributes.image_data"
                    :tokenId="token.tokenId"
                    :contractAddress="address"
                    :backgroundColor="token.attributes.background_color" />
            </v-col>
        </v-row>
        <v-row>
            <v-col>
                <v-pagination
                    v-model="page"
                    :length="Math.ceil(tokenCount / currentOptions.itemsPerPage)"
                    :total-visible="7"
                    @input="pageChanged">
                </v-pagination>
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
        page: 1,
        loading: false,
        tokens: [],
        tokenCount: 0,
        currentOptions: { page: 1, itemsPerPage: 12, sortBy: ['tokenId'], sortDesc: [false] }
    }),
    mounted() {
        this.fetchTokens();
    },
    methods: {
        pageChanged(newPage) {
            this.fetchTokens({ ...this.currentOptions, page: newPage });
        },
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
