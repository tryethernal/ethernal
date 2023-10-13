<template>
    <v-dialog v-model="dialog" max-width="800" :persistent="true">
        <v-card outlined>
            <v-card-title class="success--text">
                <v-icon class="success--text mr-2">mdi-check-circle</v-icon>
                Your explorer is ready!
            </v-card-title>
            <v-card-text>
                You can access it here: <a :href="`//${domain}`" target="_blank">{{ domain }}</a>
            </v-card-text>
        </v-card>
    </v-dialog>
</template>
<script>

export default {
    name: 'DemoExplorerReadyModal',
    data: () => ({
        domain: null,
        dialog: false,
        resolve: null,
        reject: null,
    }),
    methods: {
        open(options) {
            this.dialog = true;
            this.valid = false;
            this.domain = options.domain;
            return new Promise((resolve, reject) => {
                this.resolve = resolve;
                this.reject = reject;
            });
        }
    }
}
</script>
