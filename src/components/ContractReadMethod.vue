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
            :key="inputIdx"
            :label="`${input.name || '<input>'}  (${input.type})`">
        </v-text-field>
        <div>=> {{ method.outputs.map(output => output.type).join(', ') }}</div>
        <div id="call" class="grey lighten-3 pa-2" v-show="results.length">
            <FormattedSolVar v-for="(val, idx) in results" :input="val.input" :value="val.value" :key="idx" />
        </div>
        <div id="call" class="grey lighten-3 pa-2" v-show="error">
            {{ error }}
        </div>
        <v-btn :loading="loading" class="mt-1" depressed color="primary" @click="callMethod(method)">Query</v-btn>
    </div>
</template>
<script>
import { mapGetters } from 'vuex';
import { processMethodCallParam } from '@/lib/utils';
import FormattedSolVar from './FormattedSolVar';

export default {
    name: 'ContractReadMethod',
    props: ['method', 'contract', 'options'],
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
        callMethod: function(method) {
            try {
                this.loading = true;
                this.error = null;
                const processedParams = {};
                for (let i = 0; i < this.method.inputs.length; i++) {
                    processedParams[i] = processMethodCallParam(this.params[i], this.method.inputs[i].type);
                }
                this.server.callContractReadMethod(this.contract, method.name, this.options, processedParams, this.currentWorkspace.rpcServer)
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
                console.log(JSON.parse(JSON.stringify(error)));
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
        }
    },
    computed: {
        ...mapGetters([
            'currentWorkspace'
        ])
    }
}
</script>
