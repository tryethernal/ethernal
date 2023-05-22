<template>
    <div>
        <v-row>
            <v-col cols="6"><b>Contract Name:</b> {{ contract.verification.contractName }}</v-col>
            <v-col cols="6">
                <b>Optimizer:</b> <span v-if="contract.runs"><b>Yes</b> with <b>{{ contract.runs }}</b> runs</span>
                <span v-else>No</span>
            </v-col>
        </v-row>
        <v-row>
            <v-col cols="6"><b>Compiler Version:</b> {{ contract.verification.compilerVersion }}</v-col>
            <v-col cols="6"><b>EVM Version:</b> {{ contract.verification.evmVersion }}</v-col>
        </v-row>
        <v-divider class="my-6"></v-divider>
        <v-row v-for="(source, idx) in contract.verification.sources" :key="idx">
            <v-col>
                <h5>File {{ idx + 1}} of {{ contract.verification.sources.length }}: {{ source.fileName }}</h5>
                <editor class="editor" :ref="`editor-${idx}`" v-model="source.content" @init="editorInit" lang="solidity" theme="chrome" height="500"></editor>
            </v-col>
        </v-row>
    </div>
</template>

<script>
const editor = require('vue2-ace-editor');

export default {
    name: 'ContractVerificationInfo',
    props: ['contract'],
    components: {
        editor: editor
    },
    mounted() {
        for (let i = 0; i < this.contract.verification.sources.length; i++) {
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
        editorInit: function () {
            require('brace/ext/language_tools')
            require('brace/theme/chrome')
        }
    }
}
</script>
<style scoped style="scss">
.editor {
    border: 1px solid var(--v-background-base);
    border-radius: 5px;
}
</style>
