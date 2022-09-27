<template>
<v-dialog v-model="dialog" max-width="600">
    <v-card>
        <v-card-title class="headline">Remove contract</v-card-title>

        <v-card-text>
            <v-alert type="error" v-if="errorMessage"> {{ errorMessage }}</v-alert>
            <div>
                Removing this contract will remove metadata (name, ABI, AST, hashed bytecode) associated to this address and prevent you from:
                <ul>
                    <li>Interacting with it through Ethernal.</li>
                    <li>Decoding events, function calls, internal calls (past decoded events & calls will be lost).</li>
                    <li>Decoding storage variables (past decoded variables will be lost).</li>
                </ul>
            </div>
        </v-card-text>

        <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="primary" text @click="close()">Close</v-btn>
            <v-btn id="removeContract" color="primary" :loading="loading" @click.stop="removeContract()">Remove</v-btn>
        </v-card-actions>
    </v-card>
</v-dialog>
</template>
<script>
export default {
    name: 'RemoveContractConfirmationModal',
    data: () => ({
        dialog: false,
        resolve: null,
        reject: null,
        loading: false,
        address: null,
        workspace: null,
        errorMessage: null
    }),
    methods: {
        open: function(options) {
            this.dialog = true;
            this.address = options.address;
            this.workspace = options.workspace;

            return new Promise((resolve, reject) => {
                this.resolve = resolve;
                this.reject = reject;
            });
        },
        close: function() {
            this.resolve(true);
            this.reset();
        },
        removeContract: function() {
            this.loading = true;
            this.server.removeContract(this.address)
                .then(() => {
                    if (this.$router.currentRoute.path != '/contracts')
                        this.$router.push({ path: '/contracts', query: { removedContract: this.address }});
                    this.close();
                })
                .catch((error) => {
                    this.errorMessage = error.message;
                    this.loading = false;
                });

        },
        reset: function() {
            this.address = null;
            this.workspace = null;
            this.dialog = false;
            this.reject = null;
            this.resolve = null;
            this.loading = false;
            this.errorMessage = null;
        }
    }
}
</script>
