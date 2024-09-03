<template>
    <div>
        <v-card outlined class="mb-4">
            <v-card-text>
                <v-row>
                    <v-col cols="6"><b>Contract Name:</b> {{ contract.verification.contractName }}</v-col>
                    <v-col cols="6">
                        <b>Optimizer:</b> <span v-if="contract.verification.runs"><b>Yes</b> with <b>{{ contract.verification.runs }}</b> runs</span>
                        <span v-else>No</span>
                    </v-col>
                </v-row>
                <v-row>
                    <v-col cols="6"><b>Compiler Version:</b> {{ contract.verification.compilerVersion }}</v-col>
                    <v-col cols="6"><b>EVM Version:</b> {{ contract.verification.evmVersion }}</v-col>
                </v-row>
                <v-divider class="my-4"></v-divider>
                <div class="mt-1 mb-4" v-if="hasOpenZeppelinImports">
                    <a v-if="!showOppenzeppelinImports" @click="showOppenzeppelinImports = true" class="underlined">[+] Show OZ Imports</a>
                    <a v-else @click="showOppenzeppelinImports = false" class="underlined">[-] Hide OZ Imports</a>
                </div>
                <v-row v-for="(source, idx) in displayedSources" :key="idx">
                    <v-col>
                        <h5>File {{ contract.verification.sources.indexOf(source) + 1}} of {{ contract.verification.sources.length }}: {{ source.fileName }}</h5>
                        <editor class="editor" :ref="`editor-${idx}`" v-model="source.content" @init="editorInit" lang="solidity" theme="chrome" height="500"></editor>
                    </v-col>
                </v-row>
            </v-card-text>
        </v-card>

        <v-card v-if="displayConstructorArguments" outlined class="mb-6">
            <v-card-title>
                Constructor Arguments
                <v-spacer></v-spacer>
                <span class="text-caption">
                    <a :class="{ underlined: !formattedConstructorArguments }" @click="formattedConstructorArguments = true">Formatted</a> | <a :class="{ underlined: formattedConstructorArguments }" @click="formattedConstructorArguments = false">Raw</a>
                </span>
            </v-card-title>
            <v-card-text>
                <template v-if="formattedConstructorArguments">
                    <div v-for="(arg, idx) in decodedConstructorArguments" :key="idx" style="white-space: pre;">
                        <Formatted-Sol-Var :input="arg" :value="arg.value" />
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

        <v-card v-if="contract.abi" outlined class="mb-6">
            <v-card-title>ABI</v-card-title>
            <v-card-text>
                <v-textarea dense outlined disabled :value="JSON.stringify(contract.abi)">
                    <template v-slot:append>
                        <v-btn icon @click="copyAbi()">
                            <v-icon small>mdi-content-copy</v-icon>
                        </v-btn>
                    </template>
                </v-textarea>
                <input type="hidden" id="copyAbi" :value="JSON.stringify(contract.abi)">
            </v-card-text>
        </v-card>
    </div>
</template>

<script>
const ethers = require('ethers');
const editor = require('vue2-ace-editor');
import FormattedSolVar from './FormattedSolVar';

export default {
    name: 'ContractVerificationInfo',
    props: ['contract'],
    components: {
        editor,
        FormattedSolVar
    },
    data: () => ({
        formattedConstructorArguments: true,
        showOppenzeppelinImports: false
    }),
    mounted() {
        for (let i = 0; i < this.displayedSources.length; i++) {
            const editor = this.$refs[`editor-${i}`][0].editor;
            editor.setOptions({
                readOnly: true,
                showPrintMargin: false,
                useWorker: false,
                maxLines: 25
            });
        }
    },
    methods: {
        editorInit() {
            require('brace/ext/language_tools')
            require('brace/theme/chrome')
        },
        copyAbi() {
            const webhookField = document.querySelector('#copyAbi');
            webhookField.setAttribute('type', 'text');
            webhookField.select();

            try {
                const copied = document.execCommand('copy');
                const message = copied ? 'ABI copied!' : `Couldn't copy ABI`;
                alert(message);
            } catch(error) {
                alert(`Couldn't copy ABI`);
            } finally {
                webhookField.setAttribute('type', 'hidden');
                window.getSelection().removeAllRanges();
            }
        }
    },
    computed: {
        zeroXifiedConstructorArguments() {
            return this.contract.verification.constructorArguments.startsWith('0x') ?
                this.contract.verification.constructorArguments :
                `0x${this.contract.verification.constructorArguments}`;
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
        },
        displayConstructorArguments() {
            return this.contract.verification && this.contract.verification.constructorArguments;
        },
        displayLibraries() {
            return this.contract.verification && this.contract.verification.libraries && Object.keys(this.contract.verification.libraries).length > 0;
        },
        hasOpenZeppelinImports() {
            return this.contract.verification.sources.find(s => s.fileName.startsWith('@openzeppelin/contracts'));
        },
        sourcesWithoutOppenZeppelinImports() {
            return this.contract.verification.sources.filter(s => !s.fileName.startsWith('@openzeppelin/contracts'));
        },
        displayedSources() {
            return this.showOppenzeppelinImports ? this.contract.verification.sources : this.sourcesWithoutOppenZeppelinImports;
        }
    }
}
</script>
<style scoped style="scss">
.editor {
    border: 1px solid var(--v-background-base);
    border-radius: 5px;
}
.underlined {
    text-decoration: underline;
}
</style>
