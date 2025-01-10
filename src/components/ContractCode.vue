<template>
    <div>
        <v-alert v-if="contractVerified" text type="success">Contract has been verified successfully!</v-alert>
        <v-card v-if="loading">
            <v-card-text>
                <v-skeleton-loader class="col-4" type="list-item-three-line"></v-skeleton-loader>
            </v-card-text>
        </v-card>
        <template v-else>
            <template v-if="explorerStore.id">
                <Contract-Verification-Info v-if="isVerifiedContract" :contract="contract" />
                <Contract-Verification @contractVerified="contractVerified = true" v-else :address="contract.address" />
            </template>

            <v-card class="mb-6">
                <v-card-title>Bytecode</v-card-title>
                <v-card-text v-if="contract.bytecode">
                    <v-textarea class="text-medium-emphasis" density="compact" variant="outlined" readonly :model-value="contract.bytecode">
                        <template v-slot:append-inner>
                            <v-btn variant="text" density="compact" icon="mdi-content-copy" @click="copyBytecode()"></v-btn>
                        </template>
                    </v-textarea>
                    <input type="hidden" id="copyBytecode" :value="contract.bytecode">
                </v-card-text>
                <v-card-text v-else>
                    No bytecode for this contract. Redeploy to upload it.
                </v-card-text>
            </v-card>

            <v-card>
                <v-card-title>Assembly</v-card-title>
                <v-card-text>
                    <div v-if="highlightedAsm" class="hljs" v-html="highlightedAsm"></div>
                    <span v-else>No assembly for this contract. Redeploy to upload it.</span>
                </v-card-text>
            </v-card>
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

export default {
    name: 'ContractCode',
    props: ['contract'],
    components: {
        ContractVerification,
        ContractVerificationInfo
    },
    data: () => ({
        loading: false,
        contractVerified: false
    }),
    methods: {
        copyBytecode() {
            const webhookField = document.querySelector('#copyBytecode');
            webhookField.setAttribute('type', 'text');
            webhookField.select();

            try {
                const copied = document.execCommand('copy');
                const message = copied ? 'Bytecode copied!' : `Couldn't copy bytecode`;
                alert(message);
            } catch(error) {
                alert(`Couldn't copy bytecode`);
            } finally {
                webhookField.setAttribute('type', 'hidden');
                window.getSelection().removeAllRanges();
            }
        }
    },
    computed: {
        ...mapStores(useExplorerStore),
        isVerifiedContract() {
            return this.contract.verification;
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
