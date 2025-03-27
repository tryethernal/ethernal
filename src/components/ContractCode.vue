<template>
    <div>
        <v-alert class="mb-2" v-if="justVerified" text density="compact" type="success">Contract has been verified successfully!</v-alert>
        <v-card v-if="loading">
            <v-card-text>
                <v-skeleton-loader class="col-4" type="list-item-three-line"></v-skeleton-loader>
            </v-card-text>
        </v-card>
        <template v-else>
            <template v-if="explorerStore.id">
                <Contract-Verification-Info v-if="!!verificationData" :contract="{ ...contract, verification: verificationData }" />
                <Contract-Verification @contractVerified="onContractVerified" v-else :address="contract.address" />
            </template>

            <template v-if="contract.abi">
                <h4 class="mb-1">ABI</h4>
                <v-card class="mb-6">
                    <v-card-text class="text-medium-emphasis bg-grey-lighten-4">
                        <Expandable-Text :pre="true" :maxChars="100" :text="JSON.stringify(contract.abi, null, 2)" />
                    </v-card-text>
                </v-card>
            </template>

            <template v-if="contract.bytecode">
                <h4 class="mb-1">Bytecode</h4>
                <v-card class="mb-6">
                    <v-card-text class="text-medium-emphasis bg-grey-lighten-4">
                        <Expandable-Text :pre="true" :maxChars="400" :text="contract.bytecode" />
                    </v-card-text>
                </v-card>
            </template>
            <template v-else>
                <v-card class="mb-6">
                    <v-card-text>   
                        No bytecode for this contract. Redeploy to upload it.
                    </v-card-text>
                </v-card>
            </template>

            <template v-if="highlightedAsm">
                <h4 class="mb-1">Assembly</h4>
                <v-card>
                    <v-card-text>
                        <div v-if="highlightedAsm" class="hljs" v-html="highlightedAsm"></div>
                        <span v-else>No assembly for this contract. Redeploy to upload it.</span>
                    </v-card-text>
                </v-card>
            </template>
            <template v-else>
                <v-card class="mb-6">
                    <v-card-text>
                        No assembly for this contract. Redeploy to upload it.
                    </v-card-text>
                </v-card>
            </template>
        </template>
    </div>
</template>

<script>
import 'highlight.js/styles/vs2015.css';
import hljs from 'highlight.js';
import { mapStores } from 'pinia';
import { useExplorerStore } from '../stores/explorer';
import ContractVerification from './ContractVerification.vue';
import ContractVerificationInfo from './ContractVerificationInfo.vue';
import ExpandableText from './ExpandableText.vue';

export default {
    name: 'ContractCode',
    props: ['contract'],
    components: {
        ContractVerification,
        ContractVerificationInfo,
        ExpandableText
    },
    data: () => ({
        loading: false,
        verificationData: null,
        justVerified: false
    }),
    mounted() {
        this.verificationData = this.contract.verification;
    },
    methods: {
        onContractVerified(verificationData) {
            if (!verificationData)
                return;

            this.verificationData = verificationData;
            this.justVerified = true;
        }
    },
    computed: {
        ...mapStores(useExplorerStore),
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
