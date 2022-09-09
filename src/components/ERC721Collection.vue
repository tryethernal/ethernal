<template>
    <v-container fluid>
        <template v-if="has721Enumerable && parseInt(totalSupply) > 0">
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
        </template>
        <template v-else-if="!has721Enumerable">
            <v-card outlined>
                <v-card-text>
                    Collection view is only available for ERC721 contracts that implement the Enumerable extension.
                </v-card-text>
            </v-card>
        </template>
        <template v-else-if="has721Enumerable && parseInt(totalSupply) == 0">
            <v-card outlined>
                <v-card-text>
                    It looks like this collection is empty. Mint some tokens to see them (if you just minted some, wait a few more seconds for them to be processed).
                </v-card-text>
            </v-card>
        </template>
        <template v-else>
            <v-card outlined>
                <v-card-text>
                    Error while displaying your NFT collection (debug values: <code>has721Enumerable: {{ has721Enumerable }}</code>, <code>totalSupply: {{ totalSupply }}</code>.
                </v-card-text>
            </v-card>
        </template>
    </v-container>
</template>

<script>
import ERC721TokenCard from './ERC721TokenCard';

export default {
    name: 'ERC721Collection',
    props: ['address', 'totalSupply', 'has721Enumerable'],
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
