<template>
    <v-container fluid>
        <Block-List :disableCount="true" />
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
