<template>
    <v-card v-if="unfetchable">
        <v-card-text>Couldn't fetch token information.</v-card-text>
    </v-card>
    <v-card v-else>
        <router-link v-if="imageData || owner" :to="`/token/${contractAddress}/${tokenId}`">
            <div :style="`background-color: ${backgroundColor ? '#' + backgroundColor : ''};`" rounded="lg" elevation="2" v-html="imageData"></div>
        </router-link>
        <v-skeleton-loader v-else type="image"></v-skeleton-loader>
        <v-card-text>
            <router-link v-if="name" :to="`/token/${contractAddress}/${tokenId}`">
                <b>{{ name }}</b>
            </router-link>
            <v-skeleton-loader v-else type="heading"></v-skeleton-loader>
            <br/>
            <template v-if="owner">
                Owned by <Hash-Link :type="'address'" :hash="owner" :xsHash="true" />
            </template>
            <v-skeleton-loader v-else type="text"></v-skeleton-loader>
        </v-card-text>
    </v-card>
</template>

<script>
import { mapGetters } from 'vuex';
import HashLink from './HashLink';

export default {
    name: 'ERC721TokenCard',
    props: ['contractAddress', 'index'],
    components: {
        HashLink
    },
    data: () => ({
        owner: null,
        name: null,
        imageData: null,
        tokenId: null,
        backgroundColor: null,
        unfetchable: false
    }),
    mounted() {
        this.server.getErc721TokenByIndex(this.contractAddress, this.index)
            .then(({ data }) => {
                if (!data)
                    return this.unfetchable = true;

                this.tokenId = data.tokenId;
                this.owner = data.owner;
                if (data.metadata) {
                    this.name = data.metadata.name;
                    this.imageData = data.metadata.image_data;
                    this.backgroundColor = data.metadata.backgroundColor;
                }

            })
    },
    computed: {
        ...mapGetters([
            'currentWorkspace'
        ]),
    }
}
</script>
