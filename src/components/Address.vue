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
        <v-tabs optional v-model="tab">
            <v-tab href="#transactions">Transactions</v-tab>
            <v-tab href="#contract" v-if="contract && contract.address != null">Contract</v-tab>
            <v-tab href="#storage" v-if="contract && contract.address != null && !contract.imported">Storage</v-tab>

            <v-tab-item value="transactions">
                <Transactions-List :transactions="allTransactions" :currentAddress="hash" :loading="loadingTx" />
            </v-tab-item>
        </v-tabs>

        <v-tabs-items :value="tab">
            <v-tab-item value="contract" v-if="contract">
                <h4>Artifact</h4>
                <v-card outlined class="mb-4">
                    <v-skeleton-loader v-if="contractLoader" class="col-4" type="list-item-three-line"></v-skeleton-loader>
                    <div v-if="!contractLoader && !contract.imported">
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
                            <Import-Artifact-Modal ref="importArtifactModal" />
                            <i>Upload an artifact to read contract storage and interact with it.</i><br />
                            For Truffle projects, use our <a href="https://www.npmjs.com/package/ethernal" target="_blank">CLI</a>.<br />
                            For Hardhat project, use our <a href="https://github.com/antoinedc/hardhat-ethernal" target="_blank">plugin</a>.<br />
                            Or you can manually edit contract metadata (name & ABI) <a href="#" @click.stop="openImportArtifactModal()">here</a>.
                        </v-card-text>
                    </div>
                    <div v-if="!contractLoader && contract.imported">
                        <v-card-text>
                            Contract <b>{{ contract.name }}</b> has been loaded.
                        </v-card-text>
                    </div>
                </v-card>

                <h4>Call Options</h4>
                <v-card outlined class="mb-4">
                    <v-skeleton-loader v-if="contractLoader" class="col-4" type="list-item-three-line"></v-skeleton-loader>
                    <div v-else>
                        <v-card-text v-if="contract.abi">
                            <v-row>
                                <v-col cols="5">
                                    <v-select
                                        outlined
                                        dense
                                        label="Select from address"
                                        v-model="callOptions.from"
                                        :item-text="'id'"
                                        :items="accounts">
                                        <template v-slot:item="{ item }">
                                            <v-icon small class="mr-1" v-if="item.privateKey">mdi-lock-open-outline</v-icon>
                                            {{ item.id }}
                                        </template>
                                        <template v-slot:selection="{ item }">
                                            <v-icon small class="mr-1" v-if="item.privateKey">mdi-lock-open-outline</v-icon>
                                            {{ item.id }}
                                        </template>
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
                                        v-model="callOptions.gasLimit"
                                        label="Maximum Gas">
                                    </v-text-field>
                                </v-col>
                            </v-row>
                        </v-card-text>
                        <v-card-text v-else>
                            <i>Upload an artifact to call this contract's methods.</i>
                        </v-card-text>
                    </div>
                </v-card>

                <h4>Read Methods</h4>
                <v-card outlined class="mb-4">
                    <v-skeleton-loader v-if="contractLoader" class="col-4" type="list-item-three-line"></v-skeleton-loader>
                    <div v-else>
                        <v-card-text v-if="contract.abi">
                            <v-row v-for="(method, methodIdx) in contractReadMethods" :key="methodIdx" class="pb-4">
                                <v-col cols="5">
                                    <Contract-Read-Method :contract="contract" :method="method" :options="{...callOptions}" />
                                </v-col>
                            </v-row>
                        </v-card-text>
                        <v-card-text v-else>
                            <i>Upload an artifact to call this contract's methods.</i>
                        </v-card-text>
                    </div>
                </v-card>

                <h4>Write Methods</h4>
                <v-card outlined class="mb-4">
                    <v-skeleton-loader v-if="contractLoader" class="col-4" type="list-item-three-line"></v-skeleton-loader>
                    <div v-else>
                        <v-card-text v-if="contract.abi">
                            <v-row v-for="(method, methodIdx) in contractWriteMethods" :key="methodIdx" class="pb-4">
                                <v-col cols="5">
                                    <Contract-Write-Method :contract="contract" :method="method" :options="{...callOptions}" />
                                </v-col>
                            </v-row>
                        </v-card-text>
                        <v-card-text v-else>
                            <i>Upload an artifact to call this contract's methods.</i>
                        </v-card-text>
                    </div>
                </v-card>
            </v-tab-item>

            <v-tab-item value="storage" v-if="contract && !contract.imported">
                <h4>Structure</h4>
                <v-card outlined class="mb-4">
                    <v-skeleton-loader class="col-4" type="list-item-three-line" v-if="storageLoader"></v-skeleton-loader>
                    <v-card-text v-if="storage.structure && !storageLoader && !storageError">
                        <Storage-Structure :storage="node" @addStorageStructureChild="addStorageStructureChild" v-for="(node, key, idx) in storage.structure.nodes" :key="idx" />
                    </v-card-text>
                    <v-card-text v-if="!storage.structure && !storageLoader || storageError">
                        <span v-if="storageError">
                            Error while loading storage:
                            <span v-if="storageErrorMessage">
                                <b>{{ storageErrorMessage }}</b>
                            </span>
                            <span v-else>
                                <b>You might have loaded an invalid key (maybe a badly formatted address?).</b>
                            </span>
                            <br>
                            <a href="#" @click.prevent="resetStorage()">Click here</a> to reset storage.
                        </span>
                        <i v-else>Upload contract artifact <router-link :to="`/address/${this.contract.address}?tab=contract`">here</router-link> to see variables of this contract.</i>
                    </v-card-text>
                </v-card>
                <v-row>
                    <v-col cols="3">
                        <h4>Transactions</h4>
                        <Transaction-Picker :transactions="transactionsTo" @selectedTransactionChanged="selectedTransactionChanged" />
                    </v-col>
                    <v-col cols="9">
                        <h4>Data</h4>
                        <v-card outlined v-if="dataLoader">
                            <v-skeleton-loader class="col-5" type="list-item-three-line"></v-skeleton-loader>
                        </v-card>
                        <Transaction-Data v-if="!dataLoader" @decodeTx="decodeTx" :transactionHash="selectedTransaction.hash" :abi="contract.abi" :key="selectedTransaction.hash" />
                    </v-col>
                </v-row>
            </v-tab-item>
        </v-tabs-items>
    </v-container>
</template>

<script>
const ethers = require('ethers');

import { mapGetters } from 'vuex';

import TransactionsList from './TransactionsList';
import StorageStructure from './StorageStructure';
import TransactionPicker from './TransactionPicker';
import TransactionData from './TransactionData';
import ContractReadMethod from './ContractReadMethod';
import ContractWriteMethod from './ContractWriteMethod';
import ImportArtifactModal from './ImportArtifactModal';

import FromWei from '../filters/FromWei';

export default {
    name: 'Address',
    props: ['hash'],
    components: {
        TransactionsList,
        StorageStructure,
        TransactionPicker,
        TransactionData,
        ContractReadMethod,
        ContractWriteMethod,
        ImportArtifactModal
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
        callOptions: {
            from: null,
            gasLimit: null,
            gasPrice: null
        },
        storage: {},
        transactionsFrom: [],
        transactionsTo: [],
        storageLoader: true,
        dataLoader: false,
        contractLoader: false,
        storageError: false,
        loadingTx: true
    }),
    created: function() {
        this.server.getAccountBalance(this.hash).then(balance => this.balance = ethers.BigNumber.from(balance).toString());
        this.callOptions.from = this.currentWorkspace.settings.defaultAccount;
        this.callOptions.gasLimit = this.currentWorkspace.settings.gasLimit;
        this.callOptions.gasPrice = this.currentWorkspace.settings.gasPrice;
        if (!this.tab) {
            this.tab = 'transactions';
        }
    },
    methods: {
        openImportArtifactModal: function() {
            this.$refs.importArtifactModal
                .open({ address: this.hash, name: this.contract.name, abi: JSON.stringify(this.contract.abi) })
                .then((reload) => reload ? this.bindTheStuff(this.hash) : '');
        },
        getTransactionDirection: function(trx) {
            if (this.transactionsFrom.indexOf(trx) > -1) {
                return 'OUT';
            }
            if (this.transactionsTo.indexOf(trx) > -1) {
                return 'IN';
            }
        },
        selectedTransactionChanged: function(transaction) {
            this.selectedTransaction = transaction;
            if (this.selectedTransaction.hash && !this.selectedTransaction.storage) {
                this.decodeTx(this.selectedTransaction);
            }
        },
        decodeTx: function(transaction) {
            this.dataLoader = true;
            this.server.decodeData(this.contract, this.currentWorkspace.rpcServer, transaction.blockNumber).then((data) => {
                this.db.collection('transactions')
                    .doc(transaction.hash)
                    .update({
                        storage: data
                    })
                    .finally(() => this.dataLoader = false);
            })
        },
        addStorageStructureChild: function(struct, idx, newKey) {
            this.storageLoader = true;
            this.contract.watchedPaths.push([...struct.path, newKey]);
            this.db.collection('contracts')
                .doc(this.hash)
                .update({ watchedPaths: JSON.stringify(this.contract.watchedPaths) })
                .then(this.decodeContract);
        },
        decodeContract: function() {
            this.storageError = false;
            this.storageErrorMessage = '';
            if (this.dependenciesNeded()) {
                return this.storageLoader = false;
            }
            this.server.getStructure(this.contract, this.currentWorkspace.rpcServer)
                .then(storage => this.storage = storage)
                .catch((message) => {
                    this.storageError = true;
                    this.storageErrorMessage = message.reason || message;
                })
                .finally(() => this.storageLoader = false)
        },
        dependenciesNeded: function() {
            for (const key in this.contract.dependencies) {
               if (this.contract.dependencies[key].artifact === null)
                    return true;
            }
            return false;
        },
        resetStorage: function() {
            this.db.collection('contracts')
                .doc(this.hash)
                .update({ watchedPaths: JSON.stringify([]) })
                .then(() => {
                    this.contract.watchedPaths = [];
                    this.decodeContract();
                });
        },
        bindTheStuff: function(hash) {
            this.$bind('accounts', this.db.collection('accounts'));
            var bindingTxFrom = this.$bind('transactionsFrom', this.db.collection('transactions').where('from', '==', hash));
            var bindingTxTo = this.$bind('transactionsTo', this.db.collection('transactions').where('to', '==', hash).orderBy('blockNumber', 'desc'));
            Promise.all([bindingTxFrom, bindingTxTo]).then(() => this.loadingTx = false);
            this.contractLoader = true;
            this.db.collection('contracts').doc(hash.toLowerCase()).withConverter({ fromFirestore: this.db.contractSerializer }).get().then((doc) => {
                if (!doc.exists) {
                    return;
                }
                this.contract = doc.data();
                this.db.contractStorage(hash).once('value', (snapshot) => {
                    if (snapshot.val()) {
                        this.contract.artifact = snapshot.val().artifact;
                        var dependencies = snapshot.val().dependencies;
                        var formattedDependencies = {};
                        if (dependencies) {
                            Object.entries(dependencies).map((dep) => {
                                formattedDependencies[dep[0]] = {
                                    artifact: dep[1]
                                }
                            });
                        }
                        this.contract = { ...this.contract, dependencies: formattedDependencies, watchedPaths: this.contract.watchedPaths };
                        this.decodeContract();
                    }
                    else {
                        this.storageLoader = false;
                    }
                })
                .finally(() => this.contractLoader = false);
            })
        }
    },
    watch: {
        hash: {
            immediate: true,
            handler(hash) {
                this.bindTheStuff(hash);
            }
        }
    },
    computed: {
        ...mapGetters([
            'currentWorkspace'
        ]),
        tab: {
            set (tab) {
                this.$router.replace({ query: { ...this.$route.query, tab } });
            },
            get () {
                return this.$route.query.tab;
            }
        },
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
