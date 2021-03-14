<template>
<v-dialog v-model="dialog" max-width="430">
    <v-card>
        <v-card-title class="headline">Unlock Account</v-card-title>

        <v-card-text>
            <div>Set private key for <b>{{ options.address }}</b> in order to use it for methods call. If you've already set one in the past, it will overwrite it.</div>
            <v-text-field outlined class="mt-2" v-model="pkey" label="Key*" required></v-text-field>
        </v-card-text>

        <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="primary" text @click="close()">Close</v-btn>
            <v-btn color="primary" :disabled="!pkey" @click.stop="unlockAccount(options.address, pkey)">Add</v-btn>
        </v-card-actions>
    </v-card>
</v-dialog>
</template>
<script>
export default {
    name: 'UnlockAccountModal',
    data: () => ({
        dialog: false,
        resolve: null,
        reject: null,
        options: {},
        pkey: null
    }),
    methods: {
        open: function(options) {
            this.dialog = true;
            this.options = options ;
            return new Promise((resolve, reject) => {
                this.resolve = resolve;
                this.reject = reject;
            })
        },
        close: function() {
            this.resolve(false);
            this.reset();
        },
        unlockAccount: function(address, pkey) {
            this.db.collection('accounts').doc(address).set({ pkey: pkey }, { merge: true })
            this.resolve(true);
            this.reset();
        },
        reset: function() {
            this.dialog = false;
            this.resolve = null;
            this.reject = null;
            this.options = {};
            this.pkey = null;
        }
    }
}
</script>
