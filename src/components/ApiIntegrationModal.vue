<template>
<v-dialog v-model="dialog" max-width="700" persistent>
    <v-card>
        <v-card-title class="headline">Manage API</v-card-title>
        <v-card-text>
            Enabling this will allow you to use the Ethernal API. Send the token displayed below (once activated) in a <code>token</code> GET parameter to the endpoint to authenticate yourself.
            <v-divider></v-divider>
            <v-switch id="apiSwitch" :disabled="loading" :loading="loading" v-model="enabled" :label="enabled ? 'Enabled' : 'Disabled'" @change="toggleSwitch"></v-switch>
            <v-text-field id="token" append-icon="mdi-content-copy" readonly @click:append="copyToken()" outlined dense hide-details="auto" :value="token" v-show="token"></v-text-field>
            <input type="hidden" id="copyElement" :value="token">
        </v-card-text>

        <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="primary" :disabled="loading" text @click="close()">Close</v-btn>
        </v-card-actions>
    </v-card>
</v-dialog>
</template>
<script>
import { mapGetters } from 'vuex';

export default {
    name: 'ApiIntegrationModal',
    data: () => ({
        dialog: false,
        resolve: null,
        reject: null,
        loading: false,
        enabled: false,
        token: null,
        options: {}
    }),
    methods: {
        copyToken: function() {
            const webhookField = document.querySelector('#copyElement');
            webhookField.setAttribute('type', 'text');
            webhookField.select();

            try {
                const copied = document.execCommand('copy');
                const message = copied ? 'Token copied!' : `Couldn't copy token`;
                alert(message);
            } catch(error) {
                alert(`Couldn't copy token`);
            } finally {
                webhookField.setAttribute('type', 'hidden');
                window.getSelection().removeAllRanges();
            }
        },
        open: function(options = {}) {
            this.options = options || {};
            this.enabled = !!options.enabled;
            if (this.enabled && !this.token) {
                this.loading = true;
                this.server.getWorkspaceApiToken(this.currentWorkspace.name)
                    .then(({data}) => this.token = data.token)
                    .finally(() => this.loading = false);
            }
            this.dialog = true;
            return new Promise((resolve, reject) => {
                this.resolve = resolve;
                this.reject = reject;
            })
        },
        close: function() {
            this.resolve(!!this.token);
            this.reset();
        },
        reset: function() {
            this.options = {};
            this.loading = false;
            this.dialog = false;
            this.resolve = null;
            this.reject = null;
        },
        toggleSwitch: function(value) {
            this.loading = true;
            if (value) {
                this.server.enableWorkspaceApi(this.currentWorkspace.name)
                    .then(({ data }) => {
                        this.token = data.token;
                        this.currentWorkspace
                    })
                    .finally(() => this.loading = false);
            }
            else {
                this.server.disableWorkspaceApi(this.currentWorkspace.name)
                    .then(() => this.token = null)
                    .finally(() => this.loading = false);
            }
        }
    },
    computed: {
        ...mapGetters([
            'currentWorkspace'
        ])
    }
}
</script>
