<template>
<v-dialog v-model="dialog" max-width="430">
    <v-card>
        <v-card-title class="headline">Add Account</v-card-title>

        <v-card-text>
            <div>Make sure the account has been unlocked before adding it.</div>
            <v-text-field outlined class="mt-2" v-model="address" label="Key*" required></v-text-field>
        </v-card-text>

        <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="primary" text @click="close()">Close</v-btn>
            <v-btn color="primary" :disabled="!address" @click.stop="addAccount(address)">Add</v-btn>
        </v-card-actions>
    </v-card>
</v-dialog>
</template>
<script>
import { bus } from '../bus';

export default {
    name: 'AddAccountModal',
    data: () => ({
        dialog: false,
        resolve: null,
        reject: null,
        address: null,
    }),
    methods: {
        open: function() {
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
        addAccount: function(address) {
            this.db.collection('accounts').doc(address).set({ address: address, balance: '0' }).then(() => {
                bus.$emit('syncAccount', address);
            });
            this.resolve(true);
            this.reset();
        },
        reset: function() {
            this.dialog = false;
            this.resolve = null;
            this.reject = null;
            this.address = null;
        }
    }
}
</script>
