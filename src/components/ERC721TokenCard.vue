<template>
    <v-card>
        <router-link v-if="imageData" :to="`/token/${contractAddress}/${tokenId}`">
            <div :style="`background-color: ${backgroundColor ? '#' + backgroundColor : ''};`" rounded="lg" elevation="2" v-html="imageData"></div>
        </router-link>
        <v-skeleton-loader v-else type="image"></v-skeleton-loader>
        <v-card-text>
            <b v-if="name">{{ name }}</b>
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
import HashLink from './HashLink';

export default {
    name: 'ERC721TokenCard',
    props: ['owner', 'tokenId', 'imageData', 'name', 'contractAddress', 'backgroundColor'],
    components: {
        HashLink
    },
}
</script>
