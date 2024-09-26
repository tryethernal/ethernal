<template>
<v-dialog v-model="dialog" max-width="430">
    <v-card>
        <v-card-title class="text-h5">Add key to track</v-card-title>

        <v-card-text>
            <v-text-field id="newKey" v-model="newKeyToTrack" label="Key*" required></v-text-field>
        </v-card-text>

        <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="primary" variant="text" @click.stop="close()">Close</v-btn>
            <v-btn id="addKey" color="primary" :disabled="!newKeyToTrack" variant="text" @click.stop="addNewKeyToTrack()">Add</v-btn>
        </v-card-actions>
    </v-card>
</v-dialog>
</template>
<script>
export default {
    name: 'AddTrackedKeyModal',
    data: () => ({
        dialog: false,
        resolve: null,
        reject: null,
        newKeyToTrack: null,
        options: {
            variableIndex: null
        }
    }),
    methods: {
        open: function(options) {
            this.options = Object.assign(this.options, options);
            this.dialog = true;
            return new Promise((resolve, reject) => {
                this.resolve = resolve;
                this.reject = reject;
            })
        },
        close: function() {
            this.resolve(false);
            this.reset();
        },
        addNewKeyToTrack: function() {
            this.resolve({
                variableIndex: this.options.variableIndex,
                key: this.newKeyToTrack
            });
            this.reset();
        },
        reset: function() {
            this.dialog = false;
            this.resolve = null;
            this.reject = null;
            this.newKeyToTrack = null;
            this.options.variableIndex = null;
        }
    }
}
</script>
