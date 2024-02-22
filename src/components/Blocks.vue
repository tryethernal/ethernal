<template>
    <v-container fluid>
        <v-card outlined>
            <v-card-text>
                <Block-List />
            </v-card-text>
        </v-card>
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
