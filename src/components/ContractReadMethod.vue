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
        <v-btn class="mt-1" depressed color="primary" @click="callMethod(method)">Query</v-btn>
    </div>
</template>
<script>
export default {
    name: 'ContractReadMethod',
    props: ['method', 'contract', 'options'],
    data: () => ({
        params: {},
        result: null
    }),
    methods: {
        callMethod: function(method) {
            try {
                this.contract.methods[method.name](...(Object.values(this.params) || [])).call(this.options)
                    .then(res => {
                        this.result = res;
                    })
                    .catch(error => {
                        this.result = error;
                    });
            } catch(error) {
                this.result = `Error: ${error.reason.split('(')[0]}`;
            }
        }
    }
}
</script>