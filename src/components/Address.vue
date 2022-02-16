<template>
    <v-container fluid>
        <v-row class="mb-2">
            <v-col cols="3">
                <v-card outlined>
                    <v-card-text>
                        Balance: {{ balance | fromWei('ether', chain.token) }}
                    </v-card-text>
                </v-card>
            </v-col>
            <v-spacer></v-spacer>
            <v-col align-self="end" cols="2" v-if="isContract">
                <Remove-Contract-Confirmation-Modal ref="removeContractConfirmationModal" />
                <v-btn small outlined color="error" @click.stop="openRemoveContractConfirmationModal()">
                    Remove contract
                </v-btn>
            </v-col>
        </v-row>
        <v-tabs optional v-model="tab">
            <v-tab href="#transactions">Transactions</v-tab>
            <v-tab id="contractTab" href="#contract" v-if="isContract">Contract</v-tab>
            <v-tab id="storageTab" href="#storage" v-if="isContract && !contract.imported">Storage</v-tab>
            <v-tab id="tokenTab" href="#token" v-if="isTokenContract">Token</v-tab>

            <v-tab-item value="transactions">
                <Transactions-List :transactions="allTransactions" :currentAddress="hash" :loading="loadingTx" />
            </v-tab-item>
        </v-tabs>

        <v-tabs-items :value="tab">
            <v-tab-item value="contract" v-if="contract">

                <template>
                    <h4>Artifact</h4>
                    <v-card outlined class="mb-4">
                        <v-skeleton-loader v-if="contractLoader" class="col-4" type="list-item-three-line"></v-skeleton-loader>
                        <div v-if="!contractLoader">
                            <Import-Artifact-Modal ref="importArtifactModal" />
                            <v-card-text v-if="contract.name">
                                Artifact for contract "<b>{{ contract.name }}</b>" has been uploaded. (<a href="#" @click.stop="openImportArtifactModal()">Edit</a>)
                                <div v-if="contract.dependencies.length" class="mb-1 mt-2">
                                    <h5>Dependencies:</h5>
                                    {{ contract.dependencies.join(', ') }}
                                </div>
                            </v-card-text>
                            <v-card-text v-else>
                                <i>Upload an artifact to read contract storage and interact with it.</i><br />
                                For Truffle projects, use our <a href="https://www.npmjs.com/package/ethernal" target="_blank">CLI</a>.<br />
                                For Hardhat project, use our <a href="https://github.com/antoinedc/hardhat-ethernal" target="_blank">plugin</a>.<br />
                                Or you can manually edit contract metadata (name & ABI) <a href="#" @click.stop="openImportArtifactModal()">here</a>.
                            </v-card-text>
                        </div>
                    </v-card>
                </template>

                <template>
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
                </template>

                <h4>Read Methods</h4>
                <v-card outlined class="mb-4">
                    <v-skeleton-loader v-if="contractLoader" class="col-4" type="list-item-three-line"></v-skeleton-loader>
                    <div v-else>
                        <v-card-text v-if="contract.abi">
                            <v-row v-for="(method, methodIdx) in contractReadMethods" :key="methodIdx" class="pb-4">
                                <v-col cols="5">
                                    <Contract-Read-Method :contract="contract" :signature="method[0]" :method="method[1]" :options="{ ...callOptions, from: callOptions.from }" />
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
                                    <Contract-Write-Method :contract="contract" :signature="method[0]" :method="method[1]" :options="{ ...callOptions, from: callOptions.from }" />
                                </v-col>
                            </v-row>
                        </v-card-text>
                        <v-card-text v-else>
                            <i>Upload an artifact to call this contract's methods.</i>
                        </v-card-text>
                    </div>
                </v-card>
            </v-tab-item>

            <v-tab-item value="token" v-show="isTokenContract">
                <Token :contract="contract" />
            </v-tab-item>

            <v-tab-item value="storage" v-if="contract && !contract.imported">
                <template v-if="isStorageAvailable">
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
                            <v-card outlined>
                                <v-skeleton-loader v-if="dataLoader" class="col-5" type="list-item-three-line"></v-skeleton-loader>
                                <v-card-text>
                                    <Transaction-Data v-if="!dataLoader" @decodeTx="decodeTx" :transaction="selectedTransaction" :abi="contract.abi" :key="selectedTransaction.hash" />
                                </v-card-text>
                            </v-card>
                        </v-col>
                    </v-row>
                </template>
                <template v-else>
                    <v-card outlined class="mt-4">
                        <v-card-text>
                            Storage is not available on this contract. This is because the AST is not available. It can be for the following reasons:
                            <ul>
                                <li>This contract has been imported (AST is not available yet through imports).</li>
                                <li>You've synced the contract through the CLI/Hardhat plugin, but artifacts were not synced properly. If you can't figure it out, you can ask for help in the <a target="_blank" href="https://discord.gg/jEAprf45jj">Discord server</a>.</li>
                                <li>You've synced the contract through the CLI/Hardhat plugin, but are on a free plan, meaning that AST for your contracts are deleted on every Monday. You need to push the contract again, or <Upgrade-Link>upgrade your plan</Upgrade-Link>.</li>
                            </ul>
                            <br>
                            <a target="_blank" href="https://doc.tryethernal.com/dashboard-pages/contracts/reading-variables">Read more</a> on how storage reading works.
                        </v-card-text>
                    </v-card>
                </template>
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
import RemoveContractConfirmationModal from './RemoveContractConfirmationModal';
import Token from './Token';
import UpgradeLink from './UpgradeLink';

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
        ImportArtifactModal,
        RemoveContractConfirmationModal,
        Token,
        UpgradeLink
    },
    filters: {
        FromWei
    },
    data: () => ({
        contractInterface: null,
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
            gasLimit: '100000',
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
        openRemoveContractConfirmationModal: function() {
            this.$refs.removeContractConfirmationModal
                .open({ address: this.hash, workspace: this.currentWorkspace.name });
        },
        openImportArtifactModal: function() {
            this.$refs.importArtifactModal
                .open({ address: this.hash, name: this.contract.name, abi: JSON.stringify(this.contract.abi) })
                .then((reload) => reload ? this.bindTheStuff(this.hash) : null);
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

            if (this.selectedTransaction.hash && !Object.keys(this.selectedTransaction.storage || {}).length) {
                this.decodeTx(this.selectedTransaction);
            }
        },
        decodeTx: function(transaction) {
            if (!this.isStorageAvailable) return;
            this.dataLoader = true;
            this.server.decodeData(this.contract, this.currentWorkspace.rpcServer, transaction.blockNumber).then((data) => {
                this.server.syncTransactionData(this.currentWorkspace.name, transaction.hash, data)
                    .then(() => this.selectedTransaction.storage = data)
                    .finally(() => this.dataLoader = false);
            });
        },
        addStorageStructureChild: function(struct, idx, newKey) {
            this.storageLoader = true;
            this.contract.watchedPaths.push([...struct.path, newKey]);
            this.server.syncContractData(this.currentWorkspace.name, this.hash, null, null, JSON.stringify(this.contract.watchedPaths))
                .then(this.decodeContract);
        },
        decodeContract: function() {
            if (!this.isStorageAvailable) return;
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
            this.server.syncContractData(this.currentWorkspace.name, this.hash, null, null, JSON.stringify([]))
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

            this.db.collection('contracts').doc(hash).withConverter({ fromFirestore: this.db.contractSerializer }).get().then((doc) => {
                if (!doc.exists) {
                    return;
                }

                this.contract = doc.data();

                if (this.contract.abi)
                    this.contractInterface = new ethers.utils.Interface(this.contract.abi);

                this.db.contractStorage(hash).once('value', (snapshot) => {
                    if (snapshot.val()) {
                        this.contract.artifact = snapshot.val().artifact;
                        var dependencies = snapshot.val().dependencies;
                        this.contract = { ...this.contract, dependencies: Object.keys(dependencies), watchedPaths: this.contract.watchedPaths };
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
                this.bindTheStuff(hash.toLowerCase());
            }
        }
    },
    computed: {
        ...mapGetters([
            'currentWorkspace',
            'chain'
        ]),
        isStorageAvailable: function() {
            return this.contract && this.contract.dependencies && Object.keys(this.contract.dependencies).length > 0;
        },
        isContract: function() {
            return this.contract && this.contract.address;
        },
        isTokenContract: function() {
            return !!this.contract && this.contract.patterns && !!this.contract.patterns.length;
        },
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
