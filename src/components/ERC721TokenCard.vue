<template>
    <v-card>
        <router-link v-if="imageData" :to="`/token/${contractAddress}/${tokenId}`">
            <div :style="`background-color: ${backgroundColor ? '#' + backgroundColor : ''};`" rounded="lg" elevation="2" v-html="imageData"></div>
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
    props: ['owner', 'tokenId', 'imageData', 'name', 'contractAddress', 'backgroundColor'],
    components: {
        HashLink
    },
}
</script>
