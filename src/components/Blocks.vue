<template>
    <v-container fluid>
        <Block-List />
    </v-container>
</template>

<script>
import BlockList from './BlockList';

export default {
    name: 'Blocks',
    components: {
        BlockList
    }
}
</script>
