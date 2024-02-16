<template>
    <v-container fluid>
        <h4>ABI</h4>
        <v-card outlined class="mb-4">
            <v-skeleton-loader v-if="loading" class="col-4" type="list-item-three-line"></v-skeleton-loader>
            <template v-else>
                <Import-Artifact-Modal ref="importArtifactModal" v-if="isUserAdmin" />
                <v-card-text v-if="isContractVerified" class="pb-0 success--text">
                    <v-icon class="success--text mr-1" small>mdi-check-circle</v-icon>Verified contract.
                </v-card-text>
                <v-card-text v-if="contract.abi">
                    An ABI has been uploaded.<span v-if="isUserAdmin"> (<a href="#" @click.stop="openImportArtifactModal()">Edit</a>)</span>
                </v-card-text>
                <v-card-text v-if="!contract.abi && isUserAdmin">
                    Upload an ABI to interact with the contract:
                    <ul>
                        <li>For Hardhat projects, you can use our <a href="https://github.com/tryethernal/hardhat-ethernal" target="_blank">plugin</a>.</li>
                        <li>For other projects, you can use our <a href="https://github.com/tryethernal/ethernal-cli" target="_blank">CLI</a>.</li>
                        <li>Or you can manually edit the contract name & ABI <a href="#" @click.stop="openImportArtifactModal()">here</a>.</li>
                    </ul>
                </v-card-text>
                <v-card-text v-if="!contract.name && !contract.abi && !isUserAdmin">
                    This contract hasn't been verified yet.
                </v-card-text>
            </template>
        </v-card>

        <h4>Call Options</h4>
        <Contract-Call-Options
            :accounts="accounts"
            :loading="loading"
            @senderSourceChanged="onSenderSourceChanged"
            @callOptionChanged="onCallOptionChanged"
            @rpcConnectionStatusChanged="onRpcConnectionStatusChanged" />

        <h4>Read Methods</h4>
        <v-card outlined class="mb-4">
            <v-skeleton-loader v-if="loading" class="col-4" type="list-item-three-line"></v-skeleton-loader>
            <div v-else>
                <v-card-text v-if="contract.abi">
                    <v-row v-for="(method, idx) in contractReadMethods" :key="idx" class="pb-4">
                        <v-col lg="3" md="6" sm="12">
                            <Contract-Read-Method :active="rpcConnectionStatus" :contract="contract" :signature="method[0]" :method="method[1]" :options="callOptions" :senderMode="senderMode" />
                        </v-col>
                    </v-row>
                </v-card-text>
                <v-card-text v-else>
                    Upload this contract's ABI to use it here.
                </v-card-text>
            </div>
        </v-card>

        <h4>Write Methods</h4>
        <v-card outlined class="mb-4">
            <v-skeleton-loader v-if="loading" class="col-4" type="list-item-three-line"></v-skeleton-loader>
            <div v-else>
                <v-card-text v-if="contract.abi">
                    <v-row v-for="(method, idx) in contractWriteMethods" :key="idx" class="pb-4">
                        <v-col lg="3" md="6" sm="12">
                            <Contract-Write-Method :active="rpcConnectionStatus" :contract="contract" :signature="method[0]" :method="method[1]" :options="callOptions" :senderMode="senderMode" />
                        </v-col>
                    </v-row>
                </v-card-text>
                <v-card-text v-else>
                    Upload this contract's ABI to use it here.
                </v-card-text>
            </div>
        </v-card>
    </v-container>
</template>

<script>
const ethers = require('ethers');
const { sanitize } = require('../lib/utils');

import { mapGetters } from 'vuex';

import ContractCallOptions from './ContractCallOptions';
import ContractReadMethod from './ContractReadMethod';
import ContractWriteMethod from './ContractWriteMethod';
import ImportArtifactModal from './ImportArtifactModal';

export default {
    name: 'ContractInteraction',
    props: ['address'],
    components: {
        ContractCallOptions,
        ContractReadMethod,
        ContractWriteMethod,
        ImportArtifactModal
    },
    data: () => ({
        loading: true,
        contractInterface: null,
        contract: {
            dependencies: {},
            artifact: {
                abi: []
            }
        },
        callOptions: {
            from: null,
            gasLimit: null,
            gasPrice: null
        },
        rpcConnectionStatus: false,
        senderMode: null,
    }),
    created() {
        if (this.isAccountMode)
            this.rpcConnectionStatus = true;
    },
    methods: {
        onCallOptionChanged(newCallOptions) {
            this.callOptions = sanitize({
                ...this.callOptions,
                from: newCallOptions.from,
                gasLimit: newCallOptions.gasLimit,
                gasPrice: newCallOptions.gasPrice
            });
            if (this.callOptions.from)
                this.rpcConnectionStatus = true;
        },
        onSenderSourceChanged(newMode) {
            this.senderMode = newMode;
            this.rpcConnectionStatus = newMode == 'accounts';
        },
        onRpcConnectionStatusChanged(data) {
            this.rpcConnectionStatus = data.isReady;
            this.callOptions.from = { address: data.account };
        },
        openImportArtifactModal() {
            this.$refs.importArtifactModal
                .open({
                    address: this.address,
                    name: this.contract.name,
                    abi: this.contract.abi ? JSON.stringify(this.contract.abi) : null
                })
                .then(reload => reload ? this.loadContract(this.address) : null);
        },
        loadContract(address) {
            this.server.getContract(address)
                .then(({ data }) => {
                    if (!data) return;

                    this.contract = data;
                    if (this.contract.abi)
                        this.contractInterface = new ethers.utils.Interface(this.contract.abi);
                })
                .finally(() => this.loading = false);
        }
    },
    watch: {
        address: {
            immediate: true,
            handler(address) { this.loadContract(address) }
        }
    },
    computed: {
        ...mapGetters([
            'currentWorkspace',
            'accounts',
            'isUserAdmin'
        ]),
        isContractVerified() {
            return !!this.contract.verification;
        },
        isAccountMode() {
            return this.senderMode === 'accounts';
        },
        contractReadMethods: function() {
            if (!this.contractInterface) {
                return [];
            }
            return Object.entries(this.contractInterface.functions)
                .filter(([, member]) => member.type == 'function' && ['view', 'pure'].indexOf(member.stateMutability) > -1);
        },
        contractWriteMethods: function() {
            if (!this.contractInterface) {
                return [];
            }
            return Object.entries(this.contractInterface.functions)
                .filter(([, member]) => member.type == 'function' && ['view', 'pure'].indexOf(member.stateMutability) == -1);
        }
    }
}
</script>
<style scoped>
.v-window {
    overflow: visible;
}
</style>
