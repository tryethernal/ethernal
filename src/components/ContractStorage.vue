<template>
    <v-container fluid>
        <v-card outlined v-if="contractLoading">
            <v-card-text>
                <v-skeleton-loader class="col-4" type="list-item-three-line"></v-skeleton-loader>
            </v-card-text>
        </v-card>
        <template v-else-if="isStorageAvailable">
            <h4>Variables</h4>
            <v-card outlined class="mb-4">
                <v-skeleton-loader v-if="variableLoading" class="col-4" type="list-item-three-line"></v-skeleton-loader>
                <v-card-text v-if="storage.structure && !variableLoading && !error">
                    <Storage-Structure :storage="node" @addStorageStructureChild="addStorageStructureChild" v-for="(node, key, idx) in storage.structure.nodes" :key="idx" />
                </v-card-text>
                <v-card-text v-if="!storage.structure && !variableLoading || error">
                    <span v-if="error">
                        Error while loading storage:
                        <span v-if="errorMessage">
                            <b>{{ errorMessage }}</b>
                        </span>
                        <span v-else>
                            <b>You might have loaded an invalid key (maybe a badly formatted address?).</b>
                        </span>
                        <br>
                        <a href="#" @click.prevent="resetStorage()">Click here</a> to reset storage.
                    </span>
                    <i v-else>Upload contract artifact <router-link :to="`/address/${this.contract.address}?tab=interactions`">here</router-link> to see variables of this contract.</i>
                </v-card-text>
            </v-card>
            <v-row>
                <v-col cols="3">
                    <h4>Transactions</h4>
                    <Transaction-Picker :transactions="transactions" @selectedTransactionChanged="selectedTransactionChanged" />
                </v-col>
                <v-col cols="9">
                    <h4>Data</h4>
                    <v-card outlined>
                        <v-skeleton-loader v-if="dataLoading" class="col-5" type="list-item-three-line"></v-skeleton-loader>
                        <v-card-text>
                            <Transaction-Data v-if="!dataLoading" @decodeTx="decodeTx" :transaction="selectedTransaction" :abi="contract.abi" :key="selectedTransaction.hash" />
                        </v-card-text>
                    </v-card>
                </v-col>
            </v-row>
        </template>
        <template v-else>
            <v-card outlined class="mt-4">
                <v-card-text v-if="isUserAdmin">
                    Storage is not available on this contract. This is because the AST is not available. It can be for the following reasons:
                    <ul>
                        <li>This contract has been imported (AST is not available yet through imports).</li>
                        <li>You've synced the contract through the CLI/Hardhat plugin, but you didn't activate AST upload. you can do it by setting <code>uploadAst: true;</code> in your Hardhat config or by passing <code>--astUpload true</code> to the CLI.</li>
                        <li>You've synced the contract through the CLI/Hardhat plugin, but are on a free plan, meaning that AST for your contracts are deleted after 7 days. You need to push the contract again, or <Upgrade-Link>upgrade your plan</Upgrade-Link>.</li>
                    </ul>
                    <br>
                    <a target="_blank" href="https://doc.tryethernal.com/dashboard-pages/contracts/reading-variables">Read more</a> on how storage reading works.
                </v-card-text>
                <v-card-text v-else>
                    Storage is not available on this contract.
                </v-card-text>
            </v-card>
        </template>
    </v-container>
</template>

<script>
const moment = require('moment');
import { mapGetters } from 'vuex';
import StorageStructure from './StorageStructure';
import TransactionPicker from './TransactionPicker';
import TransactionData from './TransactionData';
import UpgradeLink from './UpgradeLink';

export default {
    name: 'ContractStorage',
    props: ['address'],
    components: {
        StorageStructure,
        TransactionPicker,
        TransactionData,
        UpgradeLink
    },
    filters: {
    },
    data: () => ({
        variableLoading: true,
        contractLoading: true,
        error: null,
        errorMessage: '',
        storage: {},
        contract: {},
        dataLoading: false,
        selectedTransaction: {},
        transactions: []
    }),
    methods: {
        moment: moment,
        selectedTransactionChanged(transaction) {
            this.selectedTransaction = transaction;

            if (this.selectedTransaction.hash && !Object.keys(this.selectedTransaction.storage || {}).length) {
                this.decodeTx(this.selectedTransaction);
            }
        },
        decodeTx(transaction) {
            if (!this.isStorageAvailable) return;
            this.dataLoading = true;
            this.server.decodeData(this.contract, this.currentWorkspace.rpcServer, transaction.blockNumber).then((data) => {
                this.server.syncTransactionData(transaction.hash, data)
                    .then(() => this.selectedTransaction.storage = data)
                    .finally(() => this.dataLoading = false);
            });
        },
        addStorageStructureChild(struct, idx, newKey) {
            this.variableLoading = true;
            this.contract.watchedPaths.push([...struct.path, newKey]);
            this.server.updateContractWatchedPaths(this.address, JSON.stringify(this.contract.watchedPaths))
                .then(this.decodeContract);
        },
        decodeContract() {
            if (!this.isStorageAvailable)
                return this.variableLoading = false;

            this.error = false;
            this.variableLoading = true;
            this.errorMessage = '';

            if (this.dependenciesNeded())
                return this.variableLoading = false;

            this.server.getStructure(this.contract, this.currentWorkspace.rpcServer)
                .then(storage => this.storage = storage)
                .catch(message => {
                    this.error = true;
                    this.errorMessage = message.reason || message;
                })
                .finally(() => this.variableLoading = false)
        },
        dependenciesNeded() {
            for (const key in this.contract.ast.dependencies) {
               if (this.contract.ast.dependencies[key].artifact === null)
                    return true;
            }
            return false;
        },
        resetStorage() {
            this.server.syncContractData(this.address, null, null, JSON.stringify([]))
                .then(() => {
                    this.contract.watchedPaths = [];
                    this.decodeContract();
                });
        },
    },
    watch: {
        address: {
            immediate: true,
            handler(address) {
                this.server.getContract(address)
                    .then(({ data }) => {
                        this.contract = data;
                        this.decodeContract();
                    })
                    .finally(() => this.contractLoading = false);

                this.server.getAddressTransactions(address)
                    .then(({ data: { items }}) => this.transactions = items);
            }
        }
    },
    computed: {
        ...mapGetters([
            'currentWorkspace',
            'isUserAdmin'
        ]),
        isStorageAvailable() {
            return this.contract && this.contract.ast && this.contract.ast.dependencies && Object.keys(this.contract.ast.dependencies).length > 0;
        }
    }
}
</script>
