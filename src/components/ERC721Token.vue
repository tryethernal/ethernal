<template>
    <v-container fluid>
        <v-row>
            <v-col cols="3">
                <v-card rounded="lg" outlined>
                    <div v-html="image"></div>
                </v-card>
            </v-col>

            <v-col cols="6">
                <v-card outlined>
                    <v-card-subtitle><Router-Link :to="`/contracts/${token.contract.address}`">{{ token.contract.tokenName }}</Router-Link></v-card-subtitle>
                    <v-card-title>{{ name }}</v-card-title>
                    <v-card-subtitle>Owned by <Hash-Link :type="'address'" :hash="token.owner" /></v-card-subtitle>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
import HashLink from './HashLink';

export default {
    name: 'ERC721Token',
    props: ['hash', 'tokenId'],
    components: {
        HashLink
    },
    data: () => ({
        loading: false,
        token: {
            contract: {}
        }
    }),
    methods: {
        fetchErc721Token() {
            this.loading = true;
            this.server.getErc721Token(this.hash, this.tokenId)
                .then(({ data }) => this.token = data)
                .catch(console.log)
                .finally(() => this.loading = false);
        },
    },
    watch: {
        hash: {
            immediate: true,
            handler(hash) {
                this.fetchErc721Token(hash);
            }
        }
    },
    computed: {
        image() {
            const metadata = this.token.metadata;

            if (!metadata || (metadata && !metadata.image && !metadata.image_data))
                return null;

            if (metadata.image) {
                const insertableImage = metadata.image.startsWith('ipfs://') ?
                    `https://ipfs.io/ipfs/${metadata.image.slice(7, metadata.image.length)}` : metadata.image;
                return `<img style="height: 100%; width: 100%; object-fit: cover" src="${insertableImage}" />`;
            }

            if (metadata.image_data)
                return metadata.image_data;

            return null;
        },
        name() {
            return this.token.metadata.name || this.token.tokenId;
        }
    },
}
</script>
