<template>
    <v-dialog v-model="dialog" max-width="800" :persistent="true">
        <v-card outlined>
            <v-card-text class="mt-4">
                <v-progress-circular
                        class="mr-2"
                        indeterminate
                        size="16"
                        width="2"
                        color="primary"></v-progress-circular>
                    Your explorer is being finalized. You will be redirected automatically as soon as it's ready.
            </v-card-text>
        </v-card>
    </v-dialog>
</template>
<script>
import { mapGetters } from 'vuex';

export default {
    name: 'ExplorerMigratedModal',
    data: () => ({
        explorerId: null,
        dialog: false,
        resolve: null,
        reject: null
    }),
    methods: {
        open(options) {
            this.dialog = true;
            this.valid = false;
            this.explorerId = options.explorerId;
            this.getExplorer();
            return new Promise((resolve, reject) => {
                this.resolve = resolve;
                this.reject = reject;
            });
        },
        getExplorer() {
            this.server.getExplorer(this.explorerId)
                .then(({ data }) => {
                    if (data.isDemo || data.userId != this.user.id)
                        return setTimeout(this.getExplorer, 3000);
                    this.explorerId = null;
                    this.resolve();
                    this.resolve = null;
                    this.reject = null;
                    this.dialog = false;
                })
                .catch(() => {
                    setTimeout(this.getExplorer, 3000);
                });
        }
    },
    computed: {
        ...mapGetters([
            'user'
        ])
    }
}
</script>
