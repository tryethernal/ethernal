<template>
    <v-sheet outlined color="error" rounded>
        <v-card class="elevation-0">
            <v-alert text type="error" v-if="errorMessage">{{ errorMessage }}</v-alert>
            <v-card-text class="font-weight-medium error--text">
                <v-row>
                    Deleting this dex is irreversible.
                    <v-spacer></v-spacer>
                    <v-btn :loading="loading" small depressed color="error" class="mt-2" @click="deleteDex()"><v-icon class="mr-1">mdi-delete</v-icon>Delete Dex</v-btn>
                </v-row>
            </v-card-text>
        </v-card>
    </v-sheet>
</template>

<script>

export default {
    name: 'ExplorerDexSettingsDangerZone',
    props: ['v2DexId'],
    data: () => ({
        loading: false,
        errorMessage: null
    }),
    methods: {
        deleteDex() {
            this.loading = true;
            this.errorMessage = null;
            const message = 'Are you sure you want to delete your dex?';
            if (!confirm(message))
                return this.loading = false

            this.server.deleteV2Dex(this.v2DexId)
                .then(() => this.$emit('delete'))
                .catch(console.log);
        }
    }
}
</script>
