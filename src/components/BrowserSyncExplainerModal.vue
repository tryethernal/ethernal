<template>
<v-dialog v-model="dialog" max-width="600">
    <v-card v-show="show == 'intro'">
        <v-card-title class="headline">Browser Sync</v-card-title>

        <v-card-text>
            You are currently syncing blocks & transactions directly from the browser, which is great to get
            started with Ethernal and try things out!<br><br>

            However, the syncing will stop as soon as you'll close this page. So, if you are planning on using Ethernal
            more (which is hopefully the case!), you should setup our Hardhat plugin, if you are using Hardhat, or our CLI if
            you are using anything else.<br><br>

            As soon as a block will be synced from either of those plugins, browser sync will be automatically deactivated.<br><br>

            Select which node you are using to see custom installation instructions:

            <div class="mt-4" align="center">
                <v-btn @click="show = 'hardhat'" class="mr-2" elevation="0" color="primary">Hardhat</v-btn>
                <v-btn @click="show = 'cli'" elevation="0" color="primary">Something else</v-btn>
            </div>
        </v-card-text>
    </v-card>
    <v-card v-show="show == 'hardhat'">
        <v-card-title class="headline">Hardhat Plugin Setup</v-card-title>

        <v-card-text>
            <p>
                Add the <a href="https://github.com/tryethernal/hardhat-ethernal" target="_blank">plugin</a> to your project with <code>yarn add hardhat-ethernal --dev</code> or<br>
                <code>npm install hardhat-ethernal --save-dev</code><br>
            </p>
            <p>
                Add <code>require('hardhat-ethernal');</code> in your <code>hardhat-config.js</code> file.
            </p>
            <p>
                Restart your node with <code class="mr-1">ETHERNAL_API_TOKEN={{ user.apiToken }} npx hardhat node</code><v-icon @click="copyHardhatCommand()" x-small>mdi-content-copy</v-icon><br><br>
                And you are good to go :) the plugin will automatically synchronize all blocks and transactions.<br>
            </p>
            <input type="hidden" id="copyHardhatCommandElement" :value="`ETHERNAL_API_TOKEN=${ user.apiToken } npx hardhat node`">

            <div align="right">
                <v-btn outlined elevation="0" color="primary" @click="show = 'intro'">Back</v-btn>
            </div>
        </v-card-text>
    </v-card>
    <v-card v-show="show == 'cli'">
        <v-card-title class="headline">CLI Setup</v-card-title>

        <v-card-text>
            <p>
                Install the <a href="https://github.com/tryethernal/ethernal-cli" target="_blank">CLI</a> globally with <code>npm install ethernal -g</code>
            </p>

            <p>
                Run <code>ETHERNAL_API_TOKEN={{ user.apiToken }} ethernal listen -w "{{ currentWorkspace.name }}"</code><v-icon @click="copyCliCommand()" x-small>mdi-content-copy</v-icon><br><br>
                And you are good to go :) the CLI will automatically synchronize all blocks and transactions.<br>
            </p>
            <input type="hidden" id="copyCliCommandElement" :value="`ETHERNAL_API_TOKEN=${ user.apiToken } ethernal listen`">

            <div align="right">
                <v-btn outlined elevation="0" color="primary" @click="show = 'intro'">Back</v-btn>
            </div>
        </v-card-text>
    </v-card>
</v-dialog>
</template>
<script>
import { mapGetters } from 'vuex';

export default {
    name: 'BrowserSyncExplainerModal',
    data: () => ({
        show: 'intro',
        dialog: false,
        resolve: null,
        reject: null,
        loading: false,
        submitted: false,
        options: {}
    }),
    methods: {
        copyHardhatCommand() {
            const webhookField = document.querySelector('#copyHardhatCommandElement');
            webhookField.setAttribute('type', 'text');
            webhookField.select();

            try {
                const copied = document.execCommand('copy');
                const message = copied ? 'Command copied!' : `Couldn't copy command`;
                alert(message);
            } catch(error) {
                alert(`Couldn't copy command`);
            } finally {
                webhookField.setAttribute('type', 'hidden');
                window.getSelection().removeAllRanges();
            }
        },
        copyCliCommand() {
            const webhookField = document.querySelector('#copyCliCommandElement');
            webhookField.setAttribute('type', 'text');
            webhookField.select();

            try {
                const copied = document.execCommand('copy');
                const message = copied ? 'Command copied!' : `Couldn't copy command`;
                alert(message);
            } catch(error) {
                alert(`Couldn't copy command`);
            } finally {
                webhookField.setAttribute('type', 'hidden');
                window.getSelection().removeAllRanges();
            }
        },
        open: function(options) {
            this.dialog = true;
            this.options = options || {};
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
            'currentWorkspace'
        ])
    }
}
</script>
