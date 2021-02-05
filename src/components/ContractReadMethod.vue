<template>
    <div>
        <div class="pb-1 font-weight-bold">{{ method.name }}</div>
        <v-text-field
            outlined
            dense
            hide-details="auto"
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
                this.contract.methods[method.name](...(Object.values(this.params) || [])).call(this.options)
                    .then(res => {
                        this.result = res;
                    })
                    .catch(error => {
                        this.result = error;
                    })
                    .finally(() => {
                        this.loading = false;
                    })
            } catch(error) {
                if (error.reason)
                    this.result = `Error: ${error.reason.split('(')[0]}`;
                else
                    this.result = 'Error while calling the method';
                this.loading = false;
            }
        }
    }
}
</script>