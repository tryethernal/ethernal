<template>
    <div>
        <div class="font-weight-bold">{{ method.name }}</div>
        <v-text-field
            outlined
            dense
            hide-details="auto"
            class="py-1"
            v-model="params[inputIdx]"
            v-for="(input, inputIdx) in method.inputs" :key="inputIdx"
            :label="`${input.name || '<input>'}  (${input.type})`">
        </v-text-field>
        <div class="grey lighten-3 pa-2 mt-1" v-show="result.txHash || result.message">
            <div v-show="result.message">{{ result.message }}</div>
            <a v-show="result.txHash" :href="`/transaction/${result.txHash}`" target="_blank">See Transaction</a>
        </div>
        <v-divider class="my-2"></v-divider>
        Eth to send:
        <div class="col-4 px-0 py-1">
            <v-text-field
                small
                outlined
                dense
                v-model="valueInEth"
                type="number"
                hide-details="auto"
                label="Value (in eth)">
            </v-text-field>
        </div>
        <v-btn depressed class="mt-1" color="primary" @click="sendMethod(method)">Query</v-btn>
    </div>
</template>
<script>
const Web3 = require('web3');

export default {
    name: 'ContractWriteMethod',
    props: ['method', 'contract', 'options'],
    data: () => ({
        valueInEth: 0,
        params: {},
        result: {
            txHash: null,
            message: null
        },
        web3: new Web3()
    }),
    methods: {
        sendMethod: function(method) {
            try {
                var options = this.options;
                options.value = this.value;
                this.contract.methods[method.name](...Object.values(this.params)).send(options)
                    .then(res => {
                        this.result.txHash = res.transactionHash;
                    })
                    .catch(error => {
                        var txHash = Object.keys(error.data)[0];
                        this.result = {
                            txHash: txHash,
                            message: `Error: ${error.data[txHash].error} (${error.data[txHash].reason})`
                        };
                    });
            } catch(error) {
                console.log(error);
                this.result = `Error: ${error.reason.split('(')[0]}`;
            }
        }
    },
    computed: {
        value: function() {
            return this.web3.utils.toWei(this.valueInEth.toString(), 'ether');
        }
    }
}
</script>