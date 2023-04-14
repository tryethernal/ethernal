<template>
    <v-container fluid>
        Explorer Status
    </v-container>
</template>
<script>
import { mapGetters } from 'vuex';

export default {
    name: 'Explorer Status',
    components: {
    },
    data: () => ({
    }),
    mounted() {
    },
    methods: {
    },
    computed: {
        ...mapGetters([
            'currentWorkspace',
        ]),
    }
}
</script>
