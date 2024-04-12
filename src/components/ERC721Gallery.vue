<template>
    <v-container fluid>
        <v-row>
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
                    @input="pageChanged">
                </v-pagination>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
import { mapGetters } from 'vuex';
import ERC721TokenCard from './ERC721TokenCard';

export default {
    name: 'ERC721Gallery',
    props: ['address'],
    components: {
        ERC721TokenCard
    },
    data: () => ({
        page: 1,
        tokens: [],
        currentOptions: { page: 1, itemsPerPage: 12, sortBy: ['index'], order: 'asc' },
        erc721Connector: null,
        totalSupply: 0
    }),
    mounted() {
        this.server.getErc721TotalSupply(this.address).then(({ data: { totalSupply }}) => {
            this.totalSupply = totalSupply;
            if (this.totalSupply)
                this.getTokens();
        })
        .catch(console.log)
    },
    methods: {
        pageChanged(newPage) {
            this.currentOptions = { ...this.currentOptions, page: newPage };
            this.getTokens();
        },
        getTokens() {
            this.tokens = Array.from({ length: this.currentOptions.itemsPerPage }, (_, i) => this.currentOptions.itemsPerPage * (this.currentOptions.page - 1) + i);
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
            return this.totalSupply ? Math.ceil(this.totalSupply / this.currentOptions.itemsPerPage) : 0;
        }
    }
}
</script>
