<template>
    <v-container fluid>
        <v-row>
            <v-col cols="3">
                <v-card outlined class="my-4">
                    <v-card-text>
                        Balance: {{ balance | fromWei('ether') }}
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
        <v-tabs>
            <v-tab>Transactions</v-tab>
            <v-tab v-if="contract && contract.address != null">Contract</v-tab>
            <v-tab v-if="contract && contract.address != null">Storage</v-tab>

            <v-tab-item>
                <v-data-table
                    :items="allTransactions"
                    :headers="headers"
                    :sort-by="'blockNumber'"
                    :sort-desc="true"
                    item-key="hash">
                    <template v-slot:item.timestamp="{ item }">
                        {{ item.timestamp | moment('from') }}
                    </template>
                    <template v-slot:item.hash="{ item }">
                        <Hash-Link :type="'transaction'" :hash="item.hash" />
                    </template>
                    <template v-slot:item.direction="{ item }">
                        {{ getTransactionDirection(item) }}
                    </template>
                    <template v-slot:item.from="{ item }">
                        <Hash-Link :type="'address'" :hash="item.from" />
                    </template>
                    <template v-slot:item.to="{ item }">
                        <Hash-Link :type="'address'" :hash="item.to" />
                    </template>
                    <template v-slot:item.fee="{ item }">
                        {{ item.gasPrice * item.gas | fromWei }}
                    </template>
                    <template v-slot:item.value="{ item }">
                        {{ item.value | fromWei }}
                    </template>
                </v-data-table>
            </v-tab-item>

            <v-tab-item v-if="contract">
                <h4>Artifact</h4>
                <v-card outlined class="mb-4">
                    <v-card-text v-if="contract.artifact">
                        Artifact for contract "<b>{{ contract.name }}</b>" has been uploaded.
                        <div v-if="Object.keys(contract.dependencies).length" class="mb-1 mt-2">
                            <h5>This contract has dependencies:</h5>
                        </div>

                        <div v-for="(dep, key, idx) in contract.dependencies" :key="idx" class="mb-2">
                            <div v-if="!dep.artifact">
                                Upload artifact for contract <b>{{ dep.name }}</b>
                            </div>
                            <div v-else>
                                Artifact for contract <b>{{ key }}</b> has been uploaded.
                            </div>
                        </div>
                    </v-card-text>
                    <v-card-text v-else>
                        <i>Upload an artifact to read contract storage and interact with it.</i><br />
                        For Truffle projects, use our <a href="https://www.npmjs.com/package/ethernal" target="_blank">CLI</a>.<br />
                        For Hardhat project, use our <a href="https://github.com/antoinedc/hardhat-ethernal" target="_blank">plugin</a>.<br />
                    </v-card-text>
                </v-card>

                <h4>Call Options</h4>
                <v-card outlined class="mb-4">
                    <v-card-text v-if="contract.artifact">
                        <v-row>
                            <v-col cols="5">
                                <v-select
                                    outlined
                                    dense
                                    label="Select from address"
                                    v-model="callOptions.from"
                                    :item-text="'id'"
                                    :items="accounts">
                                </v-select>
                                <v-text-field
                                    outlined
                                    dense
                                    type="number"
                                    v-model="callOptions.gasPrice"
                                    label="Gas Price (wei)">
                                </v-text-field>
                                <v-text-field
                                    outlined
                                    dense
                                    type="number"
                                    hide-details="auto"
                                    v-model="callOptions.gas"
                                    label="Maximum Gas">
                                </v-text-field>
                            </v-col>
                        </v-row>
                    </v-card-text>
                    <v-card-text v-else>
                        <i>Upload an artifact to call this contract's methods.</i>
                    </v-card-text>
                </v-card>

                <h4>Read Methods</h4>
                <v-card outlined class="mb-4">
                    <v-card-text v-if="contract.artifact">
                        <v-row v-for="(method, methodIdx) in contractReadMethods" :key="methodIdx" class="pb-4">
                            <v-col cols="5">
                                <Contract-Read-Method :contract="contractInstance" :method="method" :options="{...callOptions}" />
                            </v-col>
                        </v-row>
                    </v-card-text>
                    <v-card-text v-else>
                        <i>Upload an artifact to call this contract's methods.</i>
                    </v-card-text>
                </v-card>

                <h4>Write Methods</h4>
                <v-card outlined class="mb-4">
                    <v-card-text v-if="contract.artifact">
                        <v-row v-for="(method, methodIdx) in contractWriteMethods" :key="methodIdx" class="pb-4">
                            <v-col cols="5">
                                <Contract-Write-Method :contract="contractInstance" :method="method" :options="{...callOptions}" />
                            </v-col>
                        </v-row>
                    </v-card-text>
                    <v-card-text v-else>
                        <i>Upload an artifact to call this contract's methods.</i>
                    </v-card-text>
                </v-card>
            </v-tab-item>

            <v-tab-item v-if="contract">
                <h4>Structure</h4>
                <v-card outlined class="mb-4">
                    <v-card-text v-if="storage.structure">
                        <Storage-Structure :storage="node" @addStorageStructureChild="addStorageStructureChild" v-for="(node, key, idx) in storage.structure.nodes" :key="idx" />
                    </v-card-text>
                </v-card>
                <v-row>
                    <v-col cols="3">
                        <h4>Transactions</h4>
                        <Transaction-Picker :transactions="transactionsTo" @selectedTransactionChanged="selectedTransactionChanged" />
                    </v-col>
                    <v-col cols="9">
                        <h4>Data</h4>
                        <Transaction-Data v-if="selectedTransaction.hash" :transactionHash="selectedTransaction.hash" :abi="contract.abi" :key="selectedTransaction.hash" />
                    </v-col>
                </v-row>
            </v-tab-item>
        </v-tabs>
    </v-container>
</template>

<script>
const Web3 = require('web3');
const Decoder = require("@truffle/decoder");

import { mapGetters } from 'vuex';
import { Storage } from '../lib/storage';
import { getProvider } from '../lib/utils';

import HashLink from './HashLink';
import StorageStructure from './StorageStructure';
import TransactionPicker from './TransactionPicker';
import TransactionData from './TransactionData';
import ContractReadMethod from './ContractReadMethod';
import ContractWriteMethod from './ContractWriteMethod';
import FromWei from '../filters/FromWei';

export default {
    name: 'Address',
    props: ['hash'],
    components: {
        HashLink,
        StorageStructure,
        TransactionPicker,
        TransactionData,
        ContractReadMethod,
        ContractWriteMethod,
    },
    filters: {
        FromWei
    },
    data: () => ({
        selectedTransaction: {},
        balance: 0,
        contract: {
            dependencies: {},
            artifact: {
                abi: []
            }
        },
        accounts: [],
        web3: null,
        contractInstance: null,
        callOptions: {
            from: null,
            gas: null,
            gasPrice: null
        },
        storage: {},
        transactionsFrom: [],
        transactionsTo: [],
        transactionsHistory: [],
        headers: [
            {
                text: 'Txn Hash',
                value: 'hash',
                align: 'start'
            },
            {
                text: 'Block',
                value: 'blockNumber'
            },
            {
                text: 'Age',
                value: 'timestamp'
            },
            {
                text: '',
                value: 'direction'
            },
            {
                text: 'From',
                value: 'from'
            },
            {
                text: 'To',
                value: 'to'
            },
            {
                text: 'Value',
                value: 'value'
            },
            {
                text: 'Fee',
                value: 'fee'
            }
        ]
    }),
    created: function() {
        var provider = getProvider(this.currentWorkspace.rpcServer);
        if (provider) {
            this.web3 = new Web3(provider);
            this.web3.eth.getBalance(this.hash).then(balance => this.balance = balance);
            this.callOptions.from = this.currentWorkspace.settings.defaultAccount;
            this.callOptions.gas = this.currentWorkspace.settings.gas;
            this.callOptions.gasPrice = this.currentWorkspace.settings.gasPrice;
        }
    },
    methods: {
        getTransactionDirection(trx) {
            if (this.transactionsFrom.indexOf(trx) > -1) {
                return 'OUT';
            }
            if (this.transactionsTo.indexOf(trx) > -1) {
                return 'IN';
            }
        },
        selectedTransactionChanged: function(transaction) {
            this.selectedTransaction = transaction;
            if (!this.selectedTransaction.storage) {
                this.storage.decodeData(transaction.blockNumber).then((data) => {
                    this.db.collection('transactions')
                        .doc(transaction.hash)
                        .update({
                            storage: data
                        });
                })
            }
        },
        addStorageStructureChild: function(struct, idx, newKey) {
            this.storage.watchNewKey(struct, newKey).then(() => this.rebuildStorage());
        },
        rebuildStorage: function() {
            this.storage.buildStructure().then(() => {
                this.db.collection('contracts')
                    .doc(this.hash)
                    .update({
                        watchedPaths: JSON.stringify(this.storage.watchedPaths)
                    });
            });
        },
        decodeContract: function() {

            if (this.dependenciesNeded()) return;

            var dependenciesArtifacts = Object.entries(this.contract.dependencies).map(dep => JSON.parse(dep[1].artifact));
            Decoder.forArtifactAt(JSON.parse(this.contract.artifact), this.web3, this.contract.address, dependenciesArtifacts)
                .then(instanceDecoder => {
                    this.contractInstance = new this.web3.eth.Contract(this.contract.abi, this.hash);
                    this.storage = new Storage(instanceDecoder);
                    this.storage.buildStructure().then(() => this.storage.watch(this.contract.watchedPaths));
                });
        },
        dependenciesNeded: function() {
            for (const key in this.contract.dependencies) {
               if (this.contract.dependencies[key].artifact === null)
                    return true;
            }
            return false;
        }
    },
    watch: {
        hash: {
            immediate: true,
            handler(hash) {
                this.$bind('accounts', this.db.collection('accounts'));
                this.$bind('transactionsFrom', this.db.collection('transactions').where('from', '==', hash));
                this.$bind('transactionsTo', this.db.collection('transactions').where('to', '==', hash).orderBy('blockNumber', 'desc'));
                this.db.collection('contracts').doc(hash).withConverter({ fromFirestore: this.db.contractSerializer }).get().then((doc) => {
                    if (!doc.exists) {
                        return;
                    }
                    this.contract = doc.data();
                    this.db.contractStorage(hash).once('value', (snapshot) => {
                        if (snapshot.val()) {
                            this.contract.artifact = snapshot.val().artifact;
                            var dependencies = snapshot.val().dependencies;
                            if (dependencies) {
                                Object.entries(dependencies).map((dep) => {
                                    this.contract.dependencies[dep[0]] = {
                                        artifact: dep[1]
                                    }
                                });
                            }
                            this.decodeContract();
                        }
                    });
                })
            }
        }
    },
    computed: {
        ...mapGetters([
            'currentWorkspace'
        ]),
        allTransactions: function() {
            return [...this.transactionsTo, ...this.transactionsFrom];
        },
        contractReadMethods: function() {
            if (!this.contract.abi) {
                return [];
            }
            return this.contract.abi.filter(member => member.type == 'function' && member.stateMutability == 'view');
        },
        contractWriteMethods: function() {
            if (!this.contract.abi) {
                return [];
            }
            return this.contract.abi.filter(member => member.type == 'function' && member.stateMutability != 'view');
        }
    }
}
</script>
