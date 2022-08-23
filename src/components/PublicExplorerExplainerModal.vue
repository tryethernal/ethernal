<template>
<v-dialog v-model="dialog" max-width="600">
    <v-card>
        <v-card-title class="headline">Turn Your Explorer Public</v-card-title>

        <v-card-text>
            You are seeing this message because it looks like the RPC server connected to this workspace is running on a remote server.<br><br>
            Maybe it's your own EVM-chain, an internal testing chain or an external one that you are sharing with your customers.<br><br>

            If you are collaborating with others on this chain, you might be interested in setting up a public explorer that will
            be easily accessible, without login, to anyone that needs it.<br><br>

            You will get the following:
            <ul>
                <li>A public explorer showing blocks, transactions, contracts, tokens, etc...</li>
                <li>An url like http://explorer.myprotocol.com to access it</li>
                <li>A Metamask integration so your users can easily interact with contracts</li>
                <li>A contract verification system through a CLI or an UI</li>
                <li>Some nice analytics</li>
                <li>Custom branding with your colors, logo, etc...</li>
                <li>And of course all the feature that you are already currently using such as transaction decoding, transfers & balance changes display, tokens detection, etc...</li>
            </ul>
            <br>

            Here is a preview of what it looks like: <a href="https://novascan.io" target="_blank">Novascan</a>
            <br><br>

            If it sounds like something that could be useful to you, just submit your email below and we'll reach out to set that up :)
            <br><br>

            <v-row>
                <template v-if="!submitted">
                    <v-col cols="8">
                        <v-text-field hide-details outlined dense v-model="email">
                        </v-text-field>
                    </v-col>
                    <v-col>
                        <v-btn :loading="loading" class="primary" @click="submit()">Contact Me</v-btn>
                    </v-col>
                </template>
                <template v-else>
                    <v-col>
                        <div class="success--text subtitle-1">
                            <v-icon small color="success">mdi-check</v-icon> Thank you, we'll be in touch!
                        </div>
                    </v-col>
                </template>
            </v-row>
        </v-card-text>
    </v-card>
</v-dialog>
</template>
<script>
import { mapGetters } from 'vuex';

export default {
    name: 'PublicExplorerExplainerModal',
    data: () => ({
        email: null,
        dialog: false,
        resolve: null,
        reject: null,
        loading: false,
        submitted: false,
        options: {}
    }),
    methods: {
        submit() {
            this.loading = true;
            this.server.submitExplorerLead(this.email)
                .then(() => this.submitted = true)
                .catch(console.log)
                .finally(() => this.loading = false);
        },
        open: function(options) {
            this.dialog = true;
            this.options = options || {};
            this.email = this.user.email;
            return new Promise((resolve, reject) => {
                this.resolve = resolve;
                this.reject = reject;
            });
        },
        close: function() {
            this.resolve(false);
            this.reset();
        },
        reset: function() {
            this.loading = false;
            this.dialog = false;
            this.resolve = null;
            this.reject = null;
        }
    },
    computed: {
        ...mapGetters([
            'user',
        ])
    }
}
</script>
