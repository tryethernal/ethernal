<template>
    <v-container fluid>
        <v-card outlined v-if="loading">
            <v-card-text>
                <v-skeleton-loader class="col-4" type="list-item-three-line"></v-skeleton-loader>
            </v-card-text>
        </v-card>
        <template v-else>
            <template v-if="isPublicExplorer">
                <v-card v-if="isVerifiedContract" outlined class="mb-6">
                    <v-card-text>
                        <Contract-Verification-Info :contract="contract" />
                    </v-card-text>
                </v-card>
                <v-card v-else outlined class="mb-6">
                    <v-card-title>Contract Verification</v-card-title>
                    <v-card-text>
                        <Contract-Verification :address="contract.address" />
                    </v-card-text>
                </v-card>

                <v-card v-if="displayConstructorArguments" outlined class="mb-6">
                    <v-card-title>
                        Constructor Arguments
                        <v-spacer></v-spacer>
                        <span class="text-caption">
                            <a :class="{ underlined: formattedConstructorArguments }" @click="formattedConstructorArguments = true">Formatted</a> | <a :class="{ underlined: !formattedConstructorArguments }" @click="formattedConstructorArguments = false">Raw</a>
                        </span>
                    </v-card-title>
                    <v-card-text>
                        <template v-if="formattedConstructorArguments">
                            <div v-for="(arg, idx) in decodedConstructorArguments" :key="idx" style="white-space: pre;">
                                <Formatted-Sol-Var :input="arg" :notInteractive="true" :value="arg.value" />
                            </div>
                        </template>
                        <span v-else>{{ zeroXifiedConstructorArguments }}</span>
                    </v-card-text>
                </v-card>

                <v-card v-if="displayLibraries" outlined class="mb-6">
                    <v-card-title>Libraries</v-card-title>
                    <v-card-text>
                        <div v-for="(libraryName, idx) in Object.keys(contract.verification.libraries)" :key="idx">
                            {{ libraryName }} => {{ contract.verification.libraries[libraryName] }}
                        </div>
                    </v-card-text>
                </v-card>
            </template>

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
                    <div v-if="highlightedAsm" class="hljs" v-html="highlightedAsm"></div>
                    <span v-else>No assembly for this contract. Redeploy to upload it.</span>
                </v-card-text>
            </v-card>
        </template>
    </v-container>
</template>

<script>
import 'highlight.js/styles/vs2015.css';
const ethers = require('ethers');
const hljs = require('highlight.js');
import { mapGetters } from 'vuex';
import ContractVerification from './ContractVerification';
import ContractVerificationInfo from './ContractVerificationInfo';
import FormattedSolVar from './FormattedSolVar';

export default {
    name: 'ContractCode',
    props: ['contract'],
    components: {
        ContractVerification,
        ContractVerificationInfo,
        FormattedSolVar
    },
    data: () => ({
        loading: false,
        formattedConstructorArguments: true
    }),
    computed: {
        ...mapGetters([
            'isPublicExplorer'
        ]),
        zeroXifiedConstructorArguments() {
            return this.contract.verification.constructorArguments.startsWith('0x') ?
                this.contract.verification.constructorArguments :
                `0x${this.contract.verification.constructorArguments}`;
        },
        isVerifiedContract() {
            return this.contract.verificationStatus == 'success';
        },
        highlightedAsm() {
            return this.contract.asm && hljs.highlight(this.contract.asm, { language: 'x86asm' }).value
        },
        displayConstructorArguments() {
            return this.contract.verification && this.contract.verification.constructorArguments;
        },
        displayLibraries() {
            return this.contract.verification && Object.keys(this.contract.verification.libraries).length > 0;
        },
        decodedConstructorArguments() {
            const iface = new ethers.utils.Interface(this.contract.abi);
            const constructorInputs = JSON.parse(iface.deploy.format(ethers.utils.FormatTypes.json)).inputs;

            /*
                This won't handle well tuples in tuples, but hopefully it'll be good enough for now.
                I'd say that I'll improve later, but we all know it's probably never going to happen
            */
            const decodedInputs = ethers.utils.defaultAbiCoder.decode(iface.deploy.inputs.map(i => {
                if (i.type == 'tuple')
                    return `tuple(${i.components.map(c => c.type).join(',')})`;
                else
                    return i.type;
            }), this.zeroXifiedConstructorArguments);
            const decoded = [];
            for (let i = 0; i < decodedInputs.length; i++) {
                decoded.push({
                    ...constructorInputs[i],
                    value: decodedInputs[i]
                });
            }
            return decoded;
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
.underlined {
    text-decoration: underline;
}
</style>
