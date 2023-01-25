<template>
    <v-container fluid>
        <v-card outlined v-if="loading">
            <v-card-text>
                <v-skeleton-loader class="col-4" type="list-item-three-line"></v-skeleton-loader>
            </v-card-text>
        </v-card>
        <v-expansion-panels v-else v-model="activePanel" class="mt-2">
            <v-expansion-panel class="mb-2" v-if="isPublicExplorer">
                <v-expansion-panel-header>
                    <h4>Contract Verification<span v-if="isVerifiedContract" class="ml-2"><v-icon small color="success">mdi-check-circle</v-icon></span></h4>
                </v-expansion-panel-header>
                <v-expansion-panel-content>
                    <v-card class="mt-2" outlined v-if="isVerifiedContract">
                        <v-card-text>
                            This contract has already been verified. Source code & compilation settings will be added here soon.
                        </v-card-text>
                    </v-card>
                    <Contract-Verification :address="address" v-else />
                </v-expansion-panel-content>
            </v-expansion-panel>

            <v-expansion-panel class="mb-2">
                <v-expansion-panel-header><h4>Bytecode</h4></v-expansion-panel-header>
                <v-expansion-panel-content v-if="contract.bytecode">
                    <v-textarea dense outlined disabled :value="contract.bytecode">
                        <template v-slot:append>
                            <v-btn icon @click="copyBytecode()">
                                <v-icon small>mdi-content-copy</v-icon>
                            </v-btn>
                        </template>
                    </v-textarea>
                    <input type="hidden" id="copyElement" :value="contract.bytecode">
                </v-expansion-panel-content>
                <v-expansion-panel-content v-else>
                    No bytecode for this contract. Redeploy to upload it.
                </v-expansion-panel-content>
            </v-expansion-panel>

            <v-expansion-panel>
                <v-expansion-panel-header><h4>Assembly</h4></v-expansion-panel-header>
                <v-expansion-panel-content v-if="contract.asm">
                    <pre>
                        <div class="hljs" v-html="highlightedAsm"></div>
                    </pre>
                </v-expansion-panel-content>
                <v-expansion-panel-content v-else>
                    No assembly for this contract. Redeploy to upload it.
                </v-expansion-panel-content>
            </v-expansion-panel>
        </v-expansion-panels>
    </v-container>
</template>

<script>
import 'highlight.js/styles/vs2015.css';
const moment = require('moment');
const hljs = require('highlight.js');
import { mapGetters } from 'vuex';
import ContractVerification from './ContractVerification';

export default {
    name: 'ContractCode',
    props: ['address'],
    components: {
        ContractVerification
    },
    data: () => ({
        loading: true,
        contract: {},
        activePanel: 1
    }),
    methods: {
        moment: moment,
    },
    watch: {
        address: {
            immediate: true,
            handler(address) {
                this.server.getContract(address)
                    .then(({ data }) => this.contract = data)
                    .finally(() => this.loading = false);
            }
        }
    },
    computed: {
        ...mapGetters([
            'isPublicExplorer'
        ]),
        isVerifiedContract() {
            return this.isContract && this.contract.verificationStatus == 'success';
        },
        highlightedAsm() {
            return this.contract && this.contract.asm && hljs.highlight(this.contract.asm, { language: 'x86asm' }).value
        }
    }
}
</script>
<style scoped>
.hljs {
    border: 1px solid gray;
    padding: 0.5em;
    white-space: pre;
    font-family: monospace;
    line-height: 1.2;
    overflow: scroll;
    font-weight: 600;
    text-transform: uppercase;
    height: 80vh
}
</style>
