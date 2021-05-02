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
        <div class="grey lighten-3 pa-2" v-show="result">{{ result }}</div>
        <v-btn :loading="loading" class="mt-1" depressed color="primary" @click="callMethod(method)">Query</v-btn>
    </div>
</template>
<script>
const ethers = require('ethers');
import { mapGetters } from 'vuex';

export default {
    name: 'ContractReadMethod',
    props: ['method', 'contract', 'options'],
    data: () => ({
        params: {},
        result: null,
        loading: false
    }),
    methods: {
        callMethod: function(method) {
            try {
                this.loading = true;
                this.server.callContractReadMethod(this.contract, method.name, this.options, this.params, this.currentWorkspace.rpcServer)
                    .then(res => {
                        this.result = res.map(val => ethers.BigNumber.isBigNumber(val) ? ethers.BigNumber.from(val).toString() : val).join(' | ');
                    })
                    .catch(error => {
                        this.result = error.reason || error;
                    })
                    .finally(() => {
                        this.loading = false;
                    })
            } catch(error) {
                console.log(error)
                if (error.reason)
                    this.result = `Error: ${error.reason.split('(')[0]}`;
                else
                    this.result = 'Error while calling the method';
                this.loading = false;
            }
        }
    },
    computed: {
        ...mapGetters([
            'currentWorkspace'
        ])
    }
}
</script>
