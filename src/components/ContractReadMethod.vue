<template>
    <div>
        <div class="pb-1 font-weight-bold">{{ method.name }}</div>
        <v-text-field
            outlined
            dense
            hide-details="auto"
            class="py-1"
            v-model="params[inputIdx]"
            v-for="(input, inputIdx) in method.inputs"
            :disabled='!active'
            :key="inputIdx"
            :label="inputSignature(input)">
        </v-text-field>
        <div>=> {{ outputSignature }}</div>
        <div id="call" v-show="results.length">
            <v-card outlined v-for="(val, idx) in results" :key="idx" class="my-1">
                <v-card-text class="py-2 ma-0 px-1">
                    <div style="white-space: pre;">
                        <Formatted-Sol-Var :input="val.input" :value="val.value" />
                    </div>
                </v-card-text>
            </v-card>
        </div>
        <div id="call" class="grey lighten-3 pa-2" v-show="error">
            {{ error }}
        </div>
        <v-btn :disabled="!active" :loading="loading" class="mt-1" depressed :color="theme == 'dark' ? '' : 'primary'" @click="callMethod()">Query</v-btn>
    </div>
</template>
<script>
import { mapGetters } from 'vuex';
import { processMethodCallParam } from '@/lib/utils';
import FormattedSolVar from './FormattedSolVar';

export default {
    name: 'ContractReadMethod',
    props: ['method', 'contract', 'options', 'signature', 'active'],
    components: {
        FormattedSolVar
    },
    data: () => ({
        params: {},
        results: [],
        error: null,
        loading: false
    }),
    methods: {
        callMethod: function() {
            try {
                this.loading = true;
                this.error = null;
                this.results = [];
                const processedParams = {};
                for (let i = 0; i < this.method.inputs.length; i++) {
                    processedParams[i] = processMethodCallParam(this.params[i], this.method.inputs[i].type);
                }

                const provider = this.isPublicExplorer ? window.ethereum : null;
                const rpcServer = this.isPublicExplorer ? null : this.currentWorkspace.rpcServer

                this.server.callContractReadMethod(this.contract, this.signature, this.options, processedParams, rpcServer, provider)
                    .then(res => {
                        this.results = Array.isArray(res) ? this.processResult(res) : this.processResult([res]);
                    })
                    .catch(error => {
                        console.error(error);
                        this.error = error.reason || error;
                    })
                    .finally(() => {
                        this.loading = false;
                    })
            } catch(error) {
                if (error.reason)
                    this.error = `Error: ${error.reason.split('(')[0]}`;
                else
                    this.error = 'Error while calling the method';
                this.loading = false;
            }
        },
        processResult: function(result) {
            const processed = [];
            for (let i = 0; i < result.length; i++) {
                processed.push({
                    input: {
                        type: this.method.outputs[i].type,
                        name: this.method.outputs[i].name
                    },
                    value: result[i]
                })
            }
            return processed;
        },
        inputSignature: function(input) {
            if (input.type == 'tuple') {
                return `${input.name ? input.name : 'tuple'}(${input.components.map((cpt) => `${cpt.type}${cpt.name ? ` ${cpt.name}` : ''}`).join(', ')})`;
            }
            else
                return `${input.type}${input.name ? ` ${input.name}` : ''}`;
        }
    },
    computed: {
        ...mapGetters([
            'currentWorkspace',
            'isPublicExplorer',
            'theme'
        ]),
        outputSignature: function() {
            const res = [];
            const outputs = this.method.outputs;
            for (var i = 0; i < outputs.length; i++) {
                if (outputs[i].type == 'tuple') {
                    res.push(`${outputs[i].name ? outputs[i].name : 'tuple'}(${outputs[i].components.map((cpt) => `${cpt.type}${cpt.name ? ` ${cpt.name}` : ''}`).join(', ')})`);
                }
                else
                    res.push(`${outputs[i].type}${outputs[i].name ? `: ${outputs[i].name}` : ''}`);
            }
            return res.join(', ');
        }
    }
}
</script>
