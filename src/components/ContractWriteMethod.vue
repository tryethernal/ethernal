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
        <v-btn :loading="loading" depressed class="mt-1" color="primary" @click="sendMethod(method)">Query</v-btn>
    </div>
</template>
<script>
const Web3 = require('web3');
import { mapGetters } from 'vuex';
import { sanitize } from '../lib/utils';

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
        web3: new Web3(),
        loading: false
    }),
    methods: {
        sendMethod: async function(method) {
            try {
                this.loading = true;
                this.result = {
                    txHash: null,
                    message: null
                };
                var account = await this.db.collection('accounts').doc(this.options.from).get();
                var options = sanitize({...this.options, value: this.value, pkey: account.data().pkey });

                if (!this.options.gasLimit || parseInt(this.options.gasLimit) < 1) {
                    throw { reason: 'You must set a gas limit' }
                }
                this.server.callContractWriteMethod(this.contract, method.name, options, this.params, this.currentWorkspace.rpcServer)
                    .then(res => {
                        this.result.txHash = res.hash;
                    })
                    .catch(error => {
                        if (error.data) {
                            if (error.data.stack) {
                                this.result.message = error.data.stack.split('\n')[0];
                            }
                            else {
                                var txHash = Object.keys(error.data)[0];
                                this.result = {
                                    txHash: txHash,
                                    message: `Error: ${error.data[txHash].error} (${error.data[txHash].reason})`
                                };
                            }
                        }
                        else if (error.message || error.reason) {
                            this.result.message = error.message || error.reason;
                        }
                        else {
                            this.result.message = 'Error while sending the transaction';
                        }
                    })
                    .finally(() => {
                        this.loading = false;
                    });
            } catch(error) {
                if (error.reason) {
                    this.result.message = `Error: ${error.reason.split('(')[0]}`;
                }
                else {
                    console.log(error)
                    this.result.message = 'Error while sending the transaction.'
                }
                this.loading = false;
            }
        }
    },
    computed: {
        ...mapGetters([
            'currentWorkspace'
        ]),
        value: function() {
            return this.web3.utils.toWei(this.valueInEth.toString(), 'ether');
        }
    }
}
</script>
