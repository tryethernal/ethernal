<template>
    <div>
        <div class="pb-1 font-weight-bold">{{ method.name }}</div>
        <v-text-field
            variant="outlined"
            density="compact"
            hide-details="auto"
            class="py-1 col-3"
            width="50%"
            v-model="params[inputIdx]"
            v-for="(input, inputIdx) in method.inputs"
            :disabled='!walletStore.connectedAddress'
            :key="inputIdx"
            :label="inputSignature(input)">
        </v-text-field>
        <div>=> {{ outputSignature }}</div>
        <div id="call" v-show="results.length">
            <v-card v-for="(val, idx) in results" :key="idx" class="my-1">
                <v-card-text class="py-2 ma-0 px-1">
                    <div style="white-space: pre;">
                        <Formatted-Sol-Var :input="val.input" :value="val.value" />
                    </div>
                </v-card-text>
            </v-card>
        </div>
        <div id="call" class="bg-grey-lighten-3 pa-2" v-show="error">
            {{ error }}
        </div>
        <v-btn id="query" :disabled="!walletStore.connectedAddress" :loading="loading" class="mt-1" @click="callMethod()">Query</v-btn>
    </div>
</template>
<script>
import { mapStores } from 'pinia';
import { readContract } from '@web3-onboard/wagmi'
import { useCurrentWorkspaceStore } from '@/stores/currentWorkspace';
import { useWalletStore } from '@/stores/walletStore';
import { processMethodCallParam } from '@/lib/utils';
import FormattedSolVar from './FormattedSolVar.vue';

export default {
    name: 'ContractReadMethod',
    props: ['method', 'contract', 'signature'],
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
        callMethod() {
            try {
                this.loading = true;
                this.error = null;
                this.results = [];
                const processedParams = {};
                for (let i = 0; i < this.method.inputs.length; i++) {
                    processedParams[i] = processMethodCallParam(this.params[i], this.method.inputs[i].type);
                }

                readContract(this.currentWorkspaceStore.wagmiConfig, {
                    address: this.contract.address,
                    abi: this.contract.abi,
                    functionName: this.method.name,
                    args: Object.values(processedParams)
                })
                .then(res => {
                    this.results = Array.isArray(res) ? this.processResult(res) : this.processResult([res]);
                })
                .catch(error => {
                    console.log(JSON.stringify(error, null, 2));
                    this.error = `Error: ${error.shortMessage || error.message || error.reason}`
                })
                .finally(() => this.loading = false);
            } catch(error) {
                console.log(error);
                if (error.reason)
                    this.error = `Error: ${error.reason.split('(')[0]}`;
                else
                    this.error = 'Error while calling the method';
                this.loading = false;
            }
        },
        processResult(result) {
            const processed = [];
            if (this.method.outputs[0].baseType == 'array') {
                processed.push({
                    input: this.method.outputs[0],
                    value: result
                });
            }
            else {
                for (let i = 0; i < result.length; i++) {
                    processed.push({
                        input: this.method.outputs[i],
                        value: result[i]
                    });
                }
            }
            return processed;
        },
        inputSignature(input) {
            if (input.type == 'tuple') {
                return `${input.name ? input.name : 'tuple'}(${input.components.map((cpt) => `${cpt.type}${cpt.name ? ` ${cpt.name}` : ''}`).join(', ')})`;
            }
            else
                return `${input.type}${input.name ? ` ${input.name}` : ''}`;
        }
    },
    computed: {
        ...mapStores(useCurrentWorkspaceStore, useWalletStore),
        outputSignature() {
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
