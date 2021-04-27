<template>
<v-dialog v-model="dialog" max-width="700" persistent>
    <v-card>
        <v-card-title class="headline">Manage Alchemy Integration</v-card-title>
        <v-card-text>
            When enabled, this integration will give you a webhook that you should add in your Alchemy dashboard, in the Notify section, under "Mined Transactions Notifications". Once this is done, all transactions going through the selected Alchemy app will be synchronized with Ethernal, letting you used all of the features on your dapp!
            <v-divider></v-divider>
            <v-switch :disabled="loading" :loading="loading" v-model="enabled" :label="token ? 'Enabled' : 'Disabled'" @change="toggleSwitch"></v-switch>
            <v-text-field append-icon="mdi-content-copy" readonly @click:append="copyWebhook()" outlined dense hide-details="auto" :value="formattedWebhook" v-show="token"></v-text-field>
            <input type="hidden" id="copyElement" :value="formattedWebhook">
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

const ROOT_URL = process.env.VUE_APP_ROOT_URL;
export default {
    name: 'AlchemyIntegrationModal',
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
        copyWebhook: function() {
            const webhookField = document.querySelector('#copyElement');
            webhookField.setAttribute('type', 'text');
            webhookField.select();

            try {
                const copied = document.execCommand('copy');
                const message = copied ? 'Webhook copied!' : `Couldn't copy webhook`;
                alert(message);
            } catch(error) {
                alert(`Couldn't copy webhook`);
            } finally {
                webhookField.setAttribute('type', 'hidden');
                window.getSelection().removeAllRanges();
            }
        },
        open: function(options) {
            this.options = options || {};
            this.enabled = !!options.enabled;
            if (this.enabled) {
                this.loading = true;
                this.server.getWebhookToken(this.currentWorkspace.name)
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
            this.resolve(false);
            this.reset();
        },
        reset: function() {
            this.options = {};
            this.loading = false;
            this.dialog = false;
            this.resolve = null;
            this.reject = null;
        },
        toggleSwitch: async function(value) {
            this.loading = true;
            if (value) {
                this.server.enableAlchemyWebhook(this.currentWorkspace.name)
                    .then(({data}) => this.token = data.token)
                    .finally(() => this.loading = false);
            }
            else {
                this.server.disableAlchemyWebhook(this.currentWorkspace.name)
                    .then(() => this.token = null)
                    .finally(() => this.loading = false);
            }
        }
    },
    computed: {
        ...mapGetters([
            'currentWorkspace'
        ]),
        formattedWebhook: function() {
            return `${ROOT_URL}/api/webhooks/alchemy?token=${this.token}`;
        }
    }
}
</script>
