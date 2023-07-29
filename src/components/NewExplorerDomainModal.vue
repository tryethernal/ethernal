<template>
    <v-dialog v-model="dialog" max-width="600">
        <v-card outlined>
            <v-card-title>
                <template>Add Domain Alias</template>
                <v-spacer></v-spacer>
                <v-btn icon @click="close()" ><v-icon>mdi-close</v-icon></v-btn>
            </v-card-title>
            <v-card-text>
                <v-alert text type="error" v-if="errorMessage">{{ errorMessage }}</v-alert>
                <v-form @submit.prevent="save()" v-model="valid">
                    Enter your domain alias without the "http(s)" protocol.
                    <v-text-field
                        class="mt-2"
                        :rules="[v => !!this.domainOrigin || 'Invalid format']"
                        dense
                        outlined
                        v-model="domain"
                        persistent-hint
                        label="Domain Alias"></v-text-field>
                    <template v-if="domainOrigin">
                        <div class="mb-1">Log in to the account you have with your DNS provider, and add the following record:</div>
                        <div style="border-radius: 5px;" class="mb-1 pa-2 black white--text font-weight-medium">{{ domainOrigin }} A 75.2.60.5</div>
                    </template>
                    <v-card-actions>
                        <v-spacer></v-spacer>
                        <v-btn @click="save()" :loading="loading" :disabled="!valid" color="primary" tyoe="submit">Save</v-btn>
                    </v-card-actions>
                </v-form>
            </v-card-text>
        </v-card>
    </v-dialog>
</template>
<script>
import { mapGetters } from 'vuex';

export default {
    name: 'NewExplorerDomainModal',
    data: () => ({
        valid: false,
        loading: false,
        dialog: false,
        resolve: null,
        reject: null,
        errorMessage: null,
        explorer: null,
        domain: null
    }),
    methods: {
        save() {
            this.loading = true;
            this.errorMessage = null;
            this.server.addExplorerDomain(this.explorer.id, this.domainOrigin)
                .then(() => this.close(true))
                .catch(error => {
                    this.loading = false;
                    this.errorMessage = error.response && error.response.data || 'Error while adding domain. Please retry.';
                });
        },
        open(options) {
            this.dialog = true;
            this.valid = false;
            this.errorMessage = null;
            this.loading = false;
            this.explorer = options.explorer;
            return new Promise((resolve, reject) => {
                this.resolve = resolve;
                this.reject = reject;
            });
        },
        close(refresh) {
            this.resolve(refresh);
            this.reset();
        },
        reset() {
            this.resolve = null;
            this.reject = null;
            this.dialog = false;
        }
    },
    computed: {
        ...mapGetters([
            'user'
        ]),
        domainOrigin() {
            try {
                if (this.domain.startsWith('http://') || this.domain.startsWith('https://'))
                    return null;
                const url = new URL(`https://${this.domain}`);
                return url.host;
            } catch(error) {
                return null
            }
        }
    }
}
</script>
