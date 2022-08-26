<template>
    <v-card rounded="lg" elevation="2">
        <router-link :to="`/token/${contractAddress}/${tokenId}`">
            <div v-html="image"></div>
        </router-link>
        <v-card-text>
            <b>{{ name }}</b><br/>
            Owned by <Hash-Link :type="'address'" :hash="owner" :xsHash="true" />
        </v-card-text>
    </v-card>
</template>

<script>
import HashLink from './HashLink';

export default {
    name: 'ERC721TokenCard',
    props: ['owner', 'tokenId', 'metadata', 'contractAddress'],
    components: {
        HashLink
    },
    data: () => ({
        loading: false,
        tokens: [],
        tokenCount: 0,
        currentOptions: { page: 1, itemsPerPage: 10, sortBy: ['tokenId'], sortDesc: [false] }
    }),
    mounted() {},
    computed: {
        image() {
            if (!this.metadata || (this.metadata && !this.metadata.image && !this.metadata.image_data))
                return null;

            if (this.metadata.image) {
                const insertableImage = this.metadata.image.startsWith('ipfs://') ?
                    `https://ipfs.io/ipfs/${this.metadata.image.slice(7, this.metadata.image.length)}` : this.metadata.image;
                return `<img style="height: 100%; width: 100%; object-fit: cover" src="${insertableImage}" />`;
            }

            if (this.metadata.image_data)
                return this.metadata.image_data;

            return null;
        },
        name() {
            return this.metadata.name || `#${this.tokenId}`;
        }
    }
}
</script>
