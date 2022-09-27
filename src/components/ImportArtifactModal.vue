<template>
<v-dialog v-model="dialog" max-width="600">
    <v-card>
        <v-card-title class="headline">Update Contract Metadata</v-card-title>

        <v-card-text>
            <v-alert type="success" v-if="successMessage" v-html="successMessage"></v-alert>
            <v-alert type="error" v-if="errorMessage" v-html="errorMessage"></v-alert>
            <div class="mb-3">
                Edit the name and the ABI of this contract to be able to interact with its read/write methods, decode functions calls & events emitted.<br>
                Only the formatting of the ABI is checked, it's up to you to make sure it is valid for the current address. If it's not, calls will fail.
            </div>
            <div>
                <v-text-field id="contractName" class="mb-3" primary hide-details="auto" outlined dense v-model="name" label="Contract Name"></v-text-field>
                <v-textarea id="contractAbi" primary hide-details="auto" outlined dense v-model="abi" label="ABI"></v-textarea>
                <v-divider class="my-3"></v-divider>
                Or upload a json file containing a <b>contractName</b> field and/or an <b>abi</b> field (a Truffle or Hardhat build file for example):<br>
                <input type="file" id="fileUploader" ref="fileUploader" accept="application/json" v-on:change="handleFileUpload" />
            </div>
        </v-card-text>

        <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="primary" text @click.stop="close()">Close</v-btn>
            <v-btn id="updateContract" color="primary" :loading="loading" text @click.stop="update()">Update</v-btn>
        </v-card-actions>
    </v-card>
</v-dialog>
</template>
<script>
const ethers = require('ethers');
import { mapGetters } from 'vuex';

export default {
    name: 'ImportArtifactModal',
    data: () => ({
        dialog: false,
        resolve: null,
        reject: null,
        successMessage: null,
        errorMessage: null,
        loading: false,
        abi: null,
        name: null,
        address: null,
        updated: false
    }),
    methods: {
        open: function(options) {
            this.dialog = true;
            this.address = options.address;
            this.name = options.name;
            this.abi = options.abi && options.abi.trim().length ? options.abi : '';
            return new Promise((resolve, reject) => {
                this.resolve = resolve;
                this.reject = reject;
            });
        },
        onFileLoaded: function(data) {
            const parsedArtifact = JSON.parse(data.target.result);
            if (parsedArtifact.abi) {
                this.abi = JSON.stringify(parsedArtifact.abi);
            }
            if (parsedArtifact.contractName || parsedArtifact.name) {
                this.name = parsedArtifact.contractName || parsedArtifact.name;
            }
            if (!parsedArtifact.abi && !parsedArtifact.contractName) {
                this.errorMessage = `No abi or contractName fields found. Please upload a valid file.`;
            }
        },
        handleFileUpload: function(ev) {
            const file = ev.target.files[0];
            if (!file)
                return;

            const fileReader = new FileReader();
            fileReader.onload = this.onFileLoaded;
            fileReader.readAsText(file);
        },
        update: function() {
            this.loading = true;
            this.successMessage = null;
            this.errorMessage = null;
            let parsedAbi;

            try {
                parsedAbi = this.abi && this.abi.trim().length ?
                    JSON.parse(this.abi) :
                    '';
            } catch(_) {
                this.loading = false;
                return this.errorMessage = 'Invalid JSON format';
            }

            if (typeof parsedAbi == 'object') {
                try {
                    !!this.abi && new ethers.utils.Interface(parsedAbi);
                } catch(_) {
                    this.loading = false;
                    return this.errorMessage = 'Invalid ABI';
                }
            }

            this.server.syncContractData(this.address, this.name, parsedAbi)
                .then(() => {
                    this.updated = true;
                    this.successMessage = 'Metadata updated';
                })
                .catch((error) => this.errorMessage = error)
                .finally(() => this.loading = false);
        },
        close: function() {
            this.resolve(this.updated);
            this.reset();
        },
        reset: function() {
            this.dialog = false;
            this.resolve = null;
            this.reject = null;
            this.name = null;
            this.abi = null;
            this.address = null;
            this.successMessage = null;
            this.errorMessage = null;
        }
    },
    computed: {
        ...mapGetters([
            'currentWorkspace'
        ])
    }
}
</script>
