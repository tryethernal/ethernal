<template>
    <v-container fluid>
        Hello
    </v-container>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
    name: 'AddressERC721Collections',
    props: ['address'],
    components: {
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
            this.server.getErc721Tokens(this.address, this.currentOptions, this.currentWorkspace.erc721LoadingEnabled)
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
        ...mapGetters([
            'currentWorkspace'
        ]),
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
