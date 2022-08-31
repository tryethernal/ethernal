<template>
    <v-container fluid>
        <v-row>
            <v-col cols="6" sm="4" lg="2" v-for="(token, idx) in tokens" :key="idx">
                <ERC721-Token-Card
                    :owner="token.owner"
                    :name="token.attributes.name"
                    :imageData="token.attributes.image_data"
                    :index="token.index"
                    :tokenId="token.tokenId"
                    :contractAddress="address"
                    :backgroundColor="token.attributes.background_color" />
            </v-col>
        </v-row>
        <v-row>
            <v-col>
                <v-pagination
                    v-model="page"
                    :length="length"
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
    props: ['address', 'totalSupply'],
    components: {
        ERC721TokenCard
    },
    data: () => ({
        page: 1,
        tokens: [],
        currentOptions: { page: 1, itemsPerPage: 12, sortBy: ['index'], order: 'asc' }
    }),
    mounted() {
        this.getTokens();
    },
    methods: {
        pageChanged(newPage) {
            this.currentOptions = { ...this.currentOptions, page: newPage };
            this.getTokens();
        },
        getTokens() {
            this.tokens = Array(this.maxTokenLength).fill({ attributes: {}});
            this.server.getErc721Tokens(this.address, this.currentOptions)
                .then(({ data: { items } }) => {
                    const tokens = [];
                    for (let i = 0; i < this.maxTokenLength; i++)
                        tokens.push(items[i] ? items[i] : { attributes: {}});
                    this.tokens = tokens;
                })
                .catch(console.log)
        }
    },
    computed: {
        maxTokenLength() {
            if (this.currentOptions.page == this.length)
                return this.currentOptions.itemsPerPage - (this.length * this.currentOptions.itemsPerPage - this.totalSupply);
            else
                return this.currentOptions.itemsPerPage
        },
        length() {
            return Math.ceil(this.totalSupply / this.currentOptions.itemsPerPage);
        }
    }
}
</script>
