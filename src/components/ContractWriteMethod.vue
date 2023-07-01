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
            :disabled="!active"
            :label="inputSignature(input)">
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
                :disabled="!active"
                :label="`Value (in ${chain.token})`">
            </v-text-field>
        </div>
        <v-btn :disabled="!active" v-if="senderMode == 'metamask'" :loading="loading" depressed class="mt-1" :color="theme == 'dark' ? '' : 'primary'" @click="sendWithMetamask()">Query</v-btn>
        <v-btn :disabled="!active" v-else :loading="loading" depressed class="mt-1" :color="theme == 'dark' ? '' : 'primary'" @click="sendMethod()">Query</v-btn>
    </div>
</template>
<script>
const Web3 = require('web3');
const ethers = require('ethers');
import { mapGetters } from 'vuex';
import { sanitize, processMethodCallParam } from '../lib/utils';
import { formatErrorFragment } from '../lib/abi';

export default {
    name: 'ContractWriteMethod',
    props: ['method', 'contract', 'options', 'signature', 'active', 'senderMode'],
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
        sendWithMetamask: function() {
            this.loading = true;
            this.result = {
                txHash: null,
                message: null
            };

            const processedParams = {};
            for (let i = 0; i < this.method.inputs.length; i++) {
                processedParams[i] = processMethodCallParam(this.params[i], this.method.inputs[i].type);
            }
            const options = sanitize({ ...this.options, from: this.options.from.address, value: this.value });
            const provider = new ethers.providers.Web3Provider(window.ethereum, 'any');

            const signer = provider.getSigner(this.options.from.address);
            const contract = new ethers.Contract(this.contract.address, this.contract.abi, signer);

            contract.populateTransaction[this.signature](...Object.values(processedParams), options)
                .then((transaction) => {
                    const params = {
                        ...transaction,
                        value: transaction.value.toHexString()
                    };

                    window.ethereum.request({
                        method: 'eth_sendTransaction',
                        params: [params]
                    })
                    .then((txHash) => {
                        this.result.txHash = txHash;
                        this.noReceipt = true;
                    })
                    .catch((error) => this.result.message = error.message)
                    .finally(() => {
                        this.loading = false;
                    });
                })
                .catch((error) => {
                    this.loading = false;
                    console.log(error);
                    if (error.reason) {
                        this.result.message = `Error: ${error.reason}`;
                    }
                });
        },
        sendMethod: async function() {
            try {
                this.loading = true;
                this.receipt = {};
                this.noReceipt = false;
                this.result = {
                    txHash: null,
                    message: null
                };

                if (!this.options.from || !this.options.from.address)
                    throw new Error('You must select a "from" address.');

                var options = sanitize({
                    gasPrice: this.options.gasPrice,
                    gasLimit: this.options.gasLimit,
                    value: this.value,
                    privateKey: this.options.from.privateKey,
                    from: this.options.from.address
                });

                if (!this.options.gasLimit || parseInt(this.options.gasLimit) < 1) {
                    throw { reason: 'You must set a gas limit' }
                }

                const processedParams = {};
                for (let i = 0; i < this.method.inputs.length; i++) {
                    processedParams[i] = processMethodCallParam(this.params[i], this.method.inputs[i].type);
                }

                this.server.callContractWriteMethod(this.contract, this.signature, options, processedParams, this.rpcServer)
                    .then((pendingTx) => {
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
                    this.result.message = error.message || 'Error while sending the transaction.';
                }
                this.loading = false;
            }
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
            'rpcServer',
            'currentWorkspace',
            'chain',
            'isPublicExplorer',
            'theme'
        ]),
        value: function() {
            return this.web3.utils.toWei(this.valueInEth.toString(), 'ether');
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
