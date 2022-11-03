<template>
    <v-container fluid>
        <v-row class="mb-2">
            <v-col lg="3" md="6" sm="12">
                <v-card outlined>
                    <v-card-text>
                        Balance: {{ balance | fromWei('ether', chain.token) }}
                    </v-card-text>
                </v-card>
            </v-col>
            <v-spacer></v-spacer>
            <v-col align-self="end" lg="3" md="6" sm="12" v-if="isContract && currentWorkspace.isAdmin">
                <Remove-Contract-Confirmation-Modal ref="removeContractConfirmationModal" />
                <v-btn small outlined color="error" @click.stop="openRemoveContractConfirmationModal()">
                    Remove contract
                </v-btn>
            </v-col>
        </v-row>
        <v-tabs v-model="tab">
            <v-tab href="#transactions">Transactions</v-tab>
            <v-tab id="contractTab" href="#contract" v-if="isContract">Contract</v-tab>
            <v-tab id="codeTab" href="#code" v-if="isContract && isPublicExplorer">Code</v-tab>
            <v-tab id="storageTab" href="#storage" v-if="isContract && !contract.imported && !isPublicExplorer">Storage</v-tab>
            <v-tab id="erc20Balances" href="#erc20Balances">ERC-20 Tokens</v-tab>
            <v-tab id="erc721Balances" href="#erc721Balances">ERC-721 Tokens</v-tab>
            <v-tab id="collectionTab" href="#collection" v-if="isErc721">ERC-721 Collection</v-tab>
        </v-tabs>

        <v-tabs-items :value="tab">
            <v-tab-item value="transactions">
                <Address-Transactions-List :address="lowerHash" />
            </v-tab-item>

            <v-tab-item value="contract" v-if="contract">
                <template>
                    <h4>Artifact</h4>
                    <v-card outlined class="mb-4">
                        <v-skeleton-loader v-if="contractLoader" class="col-4" type="list-item-three-line"></v-skeleton-loader>
                        <template v-if="!contractLoader">
                            <Import-Artifact-Modal ref="importArtifactModal" v-if="currentWorkspace.isAdmin" />
                            <v-card-text v-if="contract.name || contract.abi">
                                <div class="mb-1 success--text" v-if="isVerifiedContract">
                                    <v-icon class="success--text mr-1" small>mdi-check-circle</v-icon>Verified contract.
                                </div>
                                <template v-if="contract.name && contract.abi">
                                    Artifact for "<b>{{ contract.name }}</b>" has been uploaded.<span v-if="currentWorkspace.isAdmin"> (<a href="#" @click.stop="openImportArtifactModal()">Edit</a>)</span>
                                </template>
                            </v-card-text>
                            <v-card-text v-if="(!contract.name || !contract.abi) && currentWorkspace.isAdmin && contract.verificationStatus != 'success'">
                                <i>Upload an artifact to read contract storage and interact with it.</i><br />
                                For Truffle projects, use our <a href="https://www.npmjs.com/package/ethernal" target="_blank">CLI</a>.<br />
                                For Hardhat project, use our <a href="https://github.com/antoinedc/hardhat-ethernal" target="_blank">plugin</a>.<br />
                                Or you can manually edit contract metadata (name & ABI) <a href="#" @click.stop="openImportArtifactModal()">here</a>.
                            </v-card-text>
                            <v-card-text v-if="!contract.name && !contract.abi && !currentWorkspace.isAdmin">
                                This contract hasn't been verified yet.
                            </v-card-text>
                        </template>
                    </v-card>
                </template>

                <template>
                    <h4>Call Options</h4>
                    <Contract-Call-Options
                        :accounts="accounts"
                        :loading="!contract"
                        @senderSourceChanged="onSenderSourceChanged"
                        @callOptionChanged="onCallOptionChanged"
                        @rpcConnectionStatusChanged="onRpcConnectionStatusChanged" />
                </template>

                <h4>Read Methods</h4>
                <v-card outlined class="mb-4">
                    <v-skeleton-loader v-if="contractLoader" class="col-4" type="list-item-three-line"></v-skeleton-loader>
                    <div v-else>
                        <v-card-text v-if="contract.abi">
                            <v-row v-for="(method, methodIdx) in contractReadMethods" :key="methodIdx" class="pb-4">
                                <v-col lg="12" md="6" sm="12">
                                    <Contract-Read-Method :active="rpcConnectionStatus" :contract="contract" :signature="method[0]" :method="method[1]" :options="callOptions" :senderMode="senderMode" />
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
                                <v-col lg="3" md="6" sm="12">
                                    <Contract-Write-Method :active="rpcConnectionStatus" :contract="contract" :signature="method[0]" :method="method[1]" :options="callOptions" :senderMode="senderMode" />
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

            <v-tab-item value="storage" v-if="contract && !contract.imported && !isPublicExplorer">
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
                                <li>You've synced the contract through the CLI/Hardhat plugin, but you didn't activate AST upload. you can do it by setting <code>uploadAst: true;</code> in your Hardhat config or by passing <code>--astUpload true</code> to the CLI.</li>
                                <li>You've synced the contract through the CLI/Hardhat plugin, but are on a free plan, meaning that AST for your contracts are deleted after 7 days. You need to push the contract again, or <Upgrade-Link>upgrade your plan</Upgrade-Link>.</li>
                            </ul>
                            <br>
                            <a target="_blank" href="https://doc.tryethernal.com/dashboard-pages/contracts/reading-variables">Read more</a> on how storage reading works.
                        </v-card-text>
                    </v-card>
                </template>
            </v-tab-item>

            <v-tab-item value="erc20Balances">
                <Token-Balances :address="hash" :patterns="['erc20']" />
            </v-tab-item>

            <v-tab-item value="erc721Balances">
                <Token-Balances :address="hash" :patterns="['erc721']" :dense="true" />
            </v-tab-item>

            <v-tab-item value="code">
                <Contract-Verification :address="hash" v-if="isUnverifiedContract" />
                <v-card class="mt-2" outlined v-else>
                    <v-card-text>
                        This contract has already been verified. Source code & compilation settings will be added here soon.
                    </v-card-text>
                </v-card>
            </v-tab-item>

            <v-tab-item v-if="isErc721" value="collection">
                <ERC-721-Collection :address="hash" :totalSupply="contract.tokenTotalSupply" :has721Enumerable="contract.has721Enumerable" />
            </v-tab-item>
        </v-tabs-items>
    </v-container>
</template>

<script>
const ethers = require('ethers');
const { sanitize } = require('../lib/utils');

import { mapGetters } from 'vuex';

import StorageStructure from './StorageStructure';
import TransactionPicker from './TransactionPicker';
import TransactionData from './TransactionData';
import ContractReadMethod from './ContractReadMethod';
import ContractWriteMethod from './ContractWriteMethod';
import ImportArtifactModal from './ImportArtifactModal';
import RemoveContractConfirmationModal from './RemoveContractConfirmationModal';
import AddressTransactionsList from './AddressTransactionsList';
import ContractVerification from './ContractVerification';
import TokenBalances from './TokenBalances';
import ERC721Collection from './ERC721Collection';
import UpgradeLink from './UpgradeLink';
import ContractCallOptions from './ContractCallOptions';

import FromWei from '../filters/FromWei';

export default {
    name: 'Address',
    props: ['hash'],
    components: {
        StorageStructure,
        TransactionPicker,
        TransactionData,
        ContractReadMethod,
        ContractWriteMethod,
        ImportArtifactModal,
        RemoveContractConfirmationModal,
        UpgradeLink,
        AddressTransactionsList,
        TokenBalances,
        ContractVerification,
        ERC721Collection,
        ContractCallOptions
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
        callOptions: {
            from: null,
            gasLimit: '100000',
            gasPrice: null
        },
        storage: {},
        transactionsTo: [],
        storageLoader: true,
        dataLoader: false,
        contractLoader: false,
        storageError: false,
        loadingTx: true,
        rpcConnectionStatus: false,
        senderMode: null
    }),
    created: function() {
        if (!this.tab)
            this.tab = 'transactions';

        this.server.getAccountBalance(this.lowerHash).then(balance => this.balance = ethers.BigNumber.from(balance).toString());
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
        },
        onSenderSourceChanged(newMode) {
            this.senderMode = newMode;
            this.rpcConnectionStatus = newMode == 'accounts';
        },
        onRpcConnectionStatusChanged: function(data) {
            this.rpcConnectionStatus = data.isReady;
            this.callOptions.from = { address: data.account };
        },
        openRemoveContractConfirmationModal: function() {
            this.$refs.removeContractConfirmationModal
                .open({ address: this.lowerHash, workspace: this.currentWorkspace.name });
        },
        openImportArtifactModal: function() {
            this.$refs.importArtifactModal
                .open({ address: this.lowerHash, name: this.contract.name, abi: JSON.stringify(this.contract.abi) })
                .then((reload) => reload ? this.bindTheStuff(this.lowerHash) : null);
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
                this.server.syncTransactionData(transaction.hash, data)
                    .then(() => this.selectedTransaction.storage = data)
                    .finally(() => this.dataLoader = false);
            });
        },
        addStorageStructureChild: function(struct, idx, newKey) {
            this.storageLoader = true;
            this.contract.watchedPaths.push([...struct.path, newKey]);
            this.server.syncContractData(this.lowerHash, null, null, JSON.stringify(this.contract.watchedPaths))
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
                .catch(message => {
                    this.storageError = true;
                    this.storageErrorMessage = message.reason || message;
                })
                .finally(() => this.storageLoader = false)
        },
        dependenciesNeded: function() {
            for (const key in this.contract.ast.dependencies) {
               if (this.contract.ast.dependencies[key].artifact === null)
                    return true;
            }
            return false;
        },
        resetStorage: function() {
            this.server.syncContractData(this.lowerHash, null, null, JSON.stringify([]))
                .then(() => {
                    this.contract.watchedPaths = [];
                    this.decodeContract();
                });
        },
        bindTheStuff: function(hash) {
            this.server.getAddressTransactions(hash)
                .then(({ data: { items }}) => {
                    this.transactionsTo = items;
                });

            this.contractLoader = true;

            this.server.getContract(hash)
                .then(({ data }) => {
                    if (!data) return;
                    this.contract = data;

                    if (this.contract.abi)
                        this.contractInterface = new ethers.utils.Interface(this.contract.abi);

                    if (this.isPublicExplorer)
                        return this.contractLoader = false;

                    this.decodeContract();
                    this.storageLoader = false;
                    this.contractLoader = false;
                })
                .catch(console.log);
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
            'chain',
            'isPublicExplorer',
            'accounts'
        ]),
        isAccountMode() {
            return this.senderMode === 'accounts';
        },
        isErc721() {
            return this.contract &&
                this.contract.patterns &&
                this.contract.patterns.indexOf('erc721') > -1;
        },
        lowerHash: function() {
            return this.hash.toLowerCase();
        },
        isStorageAvailable: function() {
            return this.contract && this.contract.ast && this.contract.ast.dependencies && Object.keys(this.contract.ast.dependencies).length > 0;
        },
        isContract: function() {
            return this.contract && this.contract.address;
        },
        isVerifiedContract() {
            return this.isContract && this.contract.verificationStatus == 'success';
        },
        isUnverifiedContract() {
            return this.isContract && this.contract.verificationStatus != 'success';
        },
        isTokenContract: function() {
            return !!this.contract && this.contract.patterns && !!this.contract.patterns.length;
        },
        tab: {
            set(tab) {
                this.$router.replace({ query: { ...this.$route.query, tab } }).catch(()=>{});
            },
            get() {
                return this.$route.query.tab;
            }
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
