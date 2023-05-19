<template>
    <v-container fluid>
        <v-card outlined v-if="loading">
            <v-card-text>
                <v-skeleton-loader class="col-4" type="list-item-three-line"></v-skeleton-loader>
            </v-card-text>
        </v-card>
        <template v-else>
            <v-card v-if="isVerifiedContract" outlined class="mb-6">
                <v-card-text>
                    <Contract-Verification-Info :contract="contract" v-if="isVerifiedContract" />
                    <Contract-Verification v-else :address="contract.address" />
                </v-card-text>
            </v-card>

            <v-card outlined class="mb-6">
                <v-card-title>Bytecode</v-card-title>
                <v-card-text v-if="contract.bytecode">
                    <v-textarea dense outlined disabled :value="contract.bytecode">
                            <template v-slot:append>
                                <v-btn icon @click="copyBytecode()">
                                    <v-icon small>mdi-content-copy</v-icon>
                                </v-btn>
                            </template>
                        </v-textarea>
                        <input type="hidden" id="copyElement" :value="contract.bytecode">
                </v-card-text>
                <v-card-text v-else>
                    No bytecode for this contract. Redeploy to upload it.
                </v-card-text>
            </v-card>

            <v-card outlined>
                <v-card-title>Assembly</v-card-title>
                <v-card-text>
                    <pre v-if="highlightedAsm">
                        <div class="hljs" v-html="highlightedAsm"></div>
                    </pre>
                    <span v-else>No assembly for this contract. Redeploy to upload it.</span>
                </v-card-text>
            </v-card>
        </template>
    </v-container>
</template>

<script>
import 'highlight.js/styles/vs2015.css';
const hljs = require('highlight.js');
import { mapGetters } from 'vuex';
import ContractVerification from './ContractVerification';
import ContractVerificationInfo from './ContractVerificationInfo';

export default {
    name: 'ContractCode',
    props: ['contract'],
    components: {
        ContractVerification,
        ContractVerificationInfo
    },
    data: () => ({
        loading: false,
    }),
    computed: {
        ...mapGetters([
            'isPublicExplorer'
        ]),
        isVerifiedContract() {
            return this.contract.verificationStatus == 'success';
        },
        highlightedAsm() {
            return this.contract.asm && hljs.highlight(this.contract.asm, { language: 'x86asm' }).value
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
    height: 50vh
}
</style>
