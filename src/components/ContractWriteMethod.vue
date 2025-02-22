<template>
    <div>
        <div class="font-weight-bold">{{ method.name }}</div>
        <v-text-field
            variant="outlined"
            density="compact"
            hide-details="auto"
            class="py-1"
            v-model="params[inputIdx]"
            v-for="(input, inputIdx) in method.inputs" :key="inputIdx"
            :disabled="!active"
            :label="inputSignature(input)">
        </v-text-field>
        <div class="col-4 px-0 py-1">
            <v-text-field
                small
                variant="outlined"
                density="compact"
                v-model="valueInEth"
                type="number"
                hide-details="auto"
                :disabled="!active"
                :label="`Value (in ${currentWorkspaceStore.chain.token})`">
            </v-text-field>
        </div>
        <div class="bg-grey-lighten-3 pa-2 mt-1" v-show="result.txHash || result.message">
            <div v-show="result.message">{{ result.message }}</div>
            <div v-show="result.txHash">
                Tx: <a :href="`/transaction/${result.txHash}`" target="_blank">{{ result.txHash }}</a>
            </div>
            <div v-show="result.txHash && receipt.status == undefined && !noReceipt">
                <v-progress-circular class="mr-2" size="16" width="2" indeterminate color="primary"></v-progress-circular>Waiting for receipt...
            </div>
            <div v-show="receipt.status != undefined" class="mt-1">
                Status: {{ receipt.status ? 'Succeeded' : 'Failed' }}
                <v-icon size="small" v-show="receipt.status" color="success-lighten-1" class="mr-2 align-with-text">mdi-check-circle</v-icon>
                <v-icon size="small" v-show="!receipt.status" color="error-lighten-1" class="mr-2 align-with-text">mdi-alert-circle</v-icon>
            </div>
            <div v-show="noReceipt && noWaitFunction">
                Couldn't get receipt.
            </div>
        </div>
        <v-divider class="my-2"></v-divider>
        <v-btn :disabled="!active" v-if="senderMode == 'metamask'" :loading="loading" variant="flat" class="mt-1" @click="sendWithMetamask()">Query</v-btn>
        <v-btn :disabled="!active" v-else :loading="loading" variant="flat" class="mt-1" @click="sendMethod()">Query</v-btn>
    </div>
</template>
<script>
const Web3 = require('web3');
const ethers = require('ethers');
import { parseEther } from 'viem';
import { writeContract } from '@web3-onboard/wagmi';
import { mapStores } from 'pinia';
import { useCurrentWorkspaceStore } from '@/stores/currentWorkspace';
import { useWalletStore } from '@/stores/walletStore';
import { sanitize, processMethodCallParam } from '../lib/utils';
import { formatErrorFragment } from '../lib/abi';

export default {
    name: 'ContractWriteMethod',
    props: ['method', 'contract', 'signature', 'senderMode', 'options'],
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
        sendWithMetamask() {
            this.loading = true;
            this.result = {
                txHash: null,
                message: null
            };

            const processedParams = {};
            for (let i = 0; i < this.method.inputs.length; i++) {
                processedParams[i] = processMethodCallParam(this.params[i], this.method.inputs[i].type);
            }

            writeContract(this.currentWorkspaceStore.wagmiConfig, sanitize({
                address: this.contract.address,
                abi: this.contract.abi,
                functionName: this.method.name,
                args: Object.values(processedParams),
                gasPrice: this.currentWorkspaceStore.gasPrice,
                gasLimit: this.currentWorkspaceStore.gasLimit,
                value: parseEther(this.valueInEth.toString()),
                connector: this.walletStore.wagmiConnector,
                account: this.walletStore.connectedAddress
            }))
            .then(res => this.result.txHash = res)
            .catch(error => {
                console.log(JSON.stringify(error, null, 2));
                this.result.message = `Error: ${error.shortMessage || error.message || error.reason}`
            })
            .finally(() => this.loading = false);
        },
        async sendMethod() {
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
                    gasPrice: this.currentWorkspaceStore.gasPrice,
                    gasLimit: this.currentWorkspaceStore.gasLimit,
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

                this.$server.callContractWriteMethod(this.contract, this.signature, options, processedParams, this.currentWorkspaceStore.rpcServer)
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
        active() {
            return this.walletStore.connectedAddress;
        },
        value() {
            return this.web3.utils.toWei(this.valueInEth.toString(), 'ether');
        },
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
