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
            :label="inputSignature">
        </v-text-field>
        <div class="grey lighten-3 pa-2 mt-1" v-show="result.txHash || result.message">
            <div v-show="result.message">{{ result.message }}</div>
            <div v-show="result.txHash">
                Tx: <a :href="`/transaction/${result.txHash}`" target="_blank">{{ result.txHash }}</a>
            </div>
            <div v-show="result.txHash && receipt.status == undefined && !noReceipt">
                <v-progress-circular class="mr-2" size="16" width="2" indeterminate color="primary"></v-progress-circular>Waiting for receipt...
            </div>
            <div v-show="receipt.status != undefined" class="mt-1">
                Status: {{ receipt.status ? 'Succeeded' : 'Failed' }}
                <v-icon small v-show="receipt.status" color="success lighten-1" class="mr-2 align-with-text">mdi-check-circle</v-icon>
                <v-icon small v-show="!receipt.status" color="error lighten-1" class="mr-2 align-with-text">mdi-alert-circle</v-icon>
            </div>
            <div v-show="noReceipt && noWaitFunction">
                Couldn't get receipt.
            </div>
        </div>
        <v-divider class="my-2"></v-divider>
        <div class="col-4 px-0 py-1">
            <v-text-field
                small
                outlined
                dense
                v-model="valueInEth"
                type="number"
                hide-details="auto"
                :label="`Value (in ${chain.token})`">
            </v-text-field>
        </div>
        <v-btn :loading="loading" depressed class="mt-1" color="primary" @click="sendMethod()">Query</v-btn>
    </div>
</template>
<script>
const Web3 = require('web3');
import { ethers } from 'ethers';
import { mapGetters } from 'vuex';
import { sanitize, processMethodCallParam } from '../lib/utils';
import { formatErrorFragment } from '../lib/abi';

export default {
    name: 'ContractWriteMethod',
    props: ['method', 'contract', 'options', 'signature'],
    data: () => ({
        valueInEth: 0,
        params: {},
        noReceipt: false,
        receipt: {},
        noWaitFunction: false,
        result: {
            txHash: null,
            message: null
        },
        web3: new Web3(),
        loading: false
    }),
    methods: {
        sendMethod: async function() {
            try {
                this.loading = true;
                this.receipt = {};
                this.noReceipt = false;
                this.result = {
                    txHash: null,
                    message: null
                };
                var account = (await this.server.getAccount(this.currentWorkspace.name, this.options.from)).data;
                var options = sanitize({...this.options, value: this.value, privateKey: account.privateKey });
                const shouldTrace = this.currentWorkspace.advancedOptions && this.currentWorkspace.advancedOptions.tracing == 'other';

                if (!this.options.gasLimit || parseInt(this.options.gasLimit) < 1) {
                    throw { reason: 'You must set a gas limit' }
                }

                const processedParams = {};
                for (let i = 0; i < this.method.inputs.length; i++) {
                    processedParams[i] = processMethodCallParam(this.params[i], this.method.inputs[i].type);
                }
                this.server.callContractWriteMethod(this.contract, this.signature, options, processedParams, this.currentWorkspace.rpcServer, shouldTrace)
                    .then(({ pendingTx, trace }) => {
                        if (trace) {
                            this.server.syncTrace(this.currentWorkspace.name, pendingTx.hash, trace);
                        }
                        this.result.txHash = pendingTx.hash;

                        if (typeof pendingTx.wait === 'function') {
                            pendingTx.wait()
                                .then((receipt) => {
                                    if (receipt)
                                        this.receipt = receipt;
                                    else
                                        this.noReceipt = true;
                                })
                                .catch((error) => {
                                    this.receipt = error.receipt;

                                    this.result = {
                                        txHash: error.transaction.hash,
                                        message: `Error: ${error.reason} `
                                    };
                                });
                        }
                        else {
                            this.noReceipt = true;
                            this.noWaitFunction = true;
                        }
                    })
                    .catch(error => {
                        console.log(error)
                        if (error.data && !error.data.stack) {
                            const jsonInterface = new ethers.utils.Interface(this.contract.abi);
                            var txHash = error.data.txHash || Object.keys(error.data)[0];
                            try {
                                const result = jsonInterface.parseError(error.data[txHash].return);
                                this.result = {
                                    txHash: txHash,
                                    message: `Error: ${formatErrorFragment(result)}`
                                };
                            } catch (parsingError) {
                                let message;
                                if (error.data[txHash] && error.data[txHash].reason)
                                    message = error.data[txHash].reason;
                                else if (error.message)
                                    message = error.message;
                                else if (error.reason)
                                    message = error.reason;
                                this.result = {
                                    txHash: txHash,
                                    message: message ? `Error: ${message}` : 'Unknown error'
                                }
                            } finally {
                                this.noReceipt = true;
                            }
                        }
                        else if (error.message || error.reason) {
                            this.result.message = `Error: ${error.message || error.reason}`;
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
                    this.result.message = `Error: ${error.reason.split('(')[0].trim()}`;
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
            'currentWorkspace',
            'chain'
        ]),
        value: function() {
            return this.web3.utils.toWei(this.valueInEth.toString(), 'ether');
        },
        inputSignature: function() {
            const res = [];
            const inputs = this.method.inputs;
            for (var i = 0; i < inputs.length; i++) {
                if (inputs[i].type == 'tuple') {
                    res.push(`${inputs[i].name ? inputs[i].name : 'tuple'}(${inputs[i].components.map((cpt) => `${cpt.type}${cpt.name ? ` ${cpt.name}` : ''}`).join(', ')})`);
                }
                else
                    res.push(`${inputs[i].type}${inputs[i].name ? ` ${inputs[i].name}` : ''}`);
            }
            return res.join(', ');
        },
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
