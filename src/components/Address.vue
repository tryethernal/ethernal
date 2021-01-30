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
            <v-tab v-if="contract && contract.address != null">State</v-tab>

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
                <h4>Truffle Artifact</h4>
                <v-card outlined class="mb-4">
                    <v-card-subtitle v-if="!contract.artifact">Upload a Truffle artifact to read contract storage and interact with it.</v-card-subtitle>
                    <v-card-subtitle v-if="contract.artifact">Artifact for contract "<b>{{ contract.artifact.contractName }}</b>" has been uploaded.</v-card-subtitle>
                    <v-card-text v-if="!contract.artifact || Object.keys(contract.dependencies).length">
                        <input  v-if="!contract.artifact" type="file" ref="file" v-on:change="handleFileUpload()"/>

                        <div v-if="Object.keys(contract.dependencies).length" class="mb-1">
                            <h5>This contract has dependencies:</h5>
                        </div>
                    
                        <div v-for="(dep, key, idx) in contract.dependencies" :key="idx" class="mb-2">
                            <div v-if="!dep.artifact">
                                Upload artifact for contract <b>{{ dep.name }}</b>: <input type="file" :ref="`file-${key}`" v-on:change="uploadArtifactDep(key)"/>
                            </div>
                            <div v-if="dep.artifact">
                                Artifact for contract <b>{{ dep.name }}</b> has been uploaded.
                            </div>
                        </div>
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
                                <Contract-Read-Method :contract="contractInstance" :method="method" :options="callOptions" />
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
                                <Contract-Write-Method :contract="contractInstance" :method="method" :options="callOptions" />
                            </v-col>
                        </v-row>
                    </v-card-text>
                    <v-card-text v-else>
                        <i>Upload an artifact to call this contract's methods.</i>
                    </v-card-text>
                </v-card>
            </v-tab-item>

            <v-tab-item v-if="contract">
                <h4>Storage Structure</h4>
                <v-card outlined class="mb-4">
                    <v-card-text>
                        <Storage-Structure :storage="struct" @addStorageStructureChild="addStorageStructureChild" 
                            v-for="(struct, key, idx) in contract.storageStructure" :key="idx" />
                    </v-card-text>
                </v-card>

                <h4>Current Storage</h4>
                <v-card outlined class="mb-4" v-if="transactionsTo[0]">
                    <v-card-subtitle>
                        Txn: <Hash-Link :type="'address'" :hash="transactionsTo[0].hash" /> |
                        Block: <router-link :to="'/block/' + transactionsTo[0].blockNumber">#{{ transactionsTo[0].blockNumber }}</router-link> | 
                        Mined {{ transactionsTo[0].timestamp | moment('from') }}
                        <span  v-if="!transactionsTo[0].storage && instanceDecoder"> | <a @click.prevent="readVariables(transactionsTo[0], transactionsTo[0].blockNumber)">Read</a></span>
                    </v-card-subtitle>
                    <v-card-text>
                        <pre>{{ transactionsTo[0].storage }}</pre>
                        <TransactionData class="mt-1" :jsonInterface="jsonInterface" :transaction="transactionsTo[0]" :key="transactionsTo[0].hash"  />
                    </v-card-text>
                </v-card>

                <h4>Storage History</h4>
                <v-card outlined v-for="transaction in transactionsTo.slice(1)" :key="transaction.hash" class="mb-2">
                    <v-card-subtitle>
                        Txn: <Hash-Link :type="'address'" :hash="transaction.hash" /> |
                        Block: <router-link :to="'/block/' + transaction.blockNumber">#{{ transaction.blockNumber }}</router-link> | 
                        Mined {{ transaction.timestamp | moment('from') }}
                        <span  v-if="!transaction.storage && instanceDecoder"> | <a @click.prevent="readVariables(transaction, transaction.blockNumber)">Read</a></span>
                    </v-card-subtitle>
                    <v-card-text>
                        <pre>{{ transaction.storage }}</pre>
                        <TransactionData class="mt-1" :jsonInterface="jsonInterface" :transaction="transaction" :key="transaction.hash" />
                    </v-card-text>
                </v-card>
            </v-tab-item>
        </v-tabs>
    </v-container>
</template>

<script>
const Web3 = require('web3');
const Decoder = require("@truffle/decoder");

import { ethers } from 'ethers';
import { mapGetters } from 'vuex';

import HashLink from './HashLink';
import StorageStructure from './StorageStructure';
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
        TransactionData,
        ContractReadMethod,
        ContractWriteMethod
    },
    filters: {
        FromWei
    },
    data: () => ({
        balance: 0,
        contract: {
            storageStructure: {},
            dependencies: {}
        },
        jsonInterface: null,
        accounts: [],
        web3: null,
        contractInstance: null,
        callOptions: {
            from: null,
            gas: null,
            gasPrice: null
        },
        instanceDecoder: null,
        addKeyDialog: false,
        treeIdx: 0,
        newKeyToTrack: null,
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
        this.web3 = new Web3(new Web3.providers.WebsocketProvider(this.currentWorkspace.rpcServer));
        this.web3.eth.getBalance(this.hash).then(balance => this.balance = balance);
        this.callOptions.from = this.currentWorkspace.settings.defaultAccount;
        this.callOptions.gas = this.currentWorkspace.settings.gas;
        this.callOptions.gasPrice = this.currentWorkspace.settings.gasPrice;
    },
    methods: {
        handleFileUpload: function() {
            var fileReader = new FileReader();
            fileReader.onload = () => {
                var artifact = fileReader.result;
                var parsedArtifact = JSON.parse(artifact);
                var dependencies = {}
                Object.entries(parsedArtifact.ast.exportedSymbols)
                    .forEach(symbol => {
                        if (symbol[0] != parsedArtifact.contractName) {
                            dependencies[symbol[1][0]] = {
                                name: symbol[0],
                                artifact: null
                            }
                        }
                    })
                this.db.collection('contracts').doc(this.hash).update({ name: parsedArtifact.contractName, artifact: artifact, dependencies: dependencies }).then(this.handleContractArtifact);
            };
            fileReader.readAsText(this.$refs.file.files[0]);
        },
        uploadArtifactDep: function(dep_id) {
            var fileReader = new FileReader();
            fileReader.onload = () => {
                var artifact = fileReader.result;
                var updateHash = {}
                updateHash[`dependencies.${dep_id}.artifact`] = artifact;
                this.db.collection('contracts').doc(this.hash).update(updateHash).then(this.handleContractArtifact);
            };
            fileReader.readAsText(this.$refs[`file-${dep_id}`][0].files[0]);
        },
        getTransactionDirection(trx) {
            if (this.transactionsFrom.indexOf(trx) > -1) {
                return 'OUT';
            }
            if (this.transactionsTo.indexOf(trx) > -1) {
                return 'IN';
            }
        },
        updateStorageStructure: function() {
            return new Promise((resolve) => {
                this.instanceDecoder.variables().then((res) => {
                    var storageStructure = {};
                    res.forEach(function(variable) {
                        storageStructure[variable.name] = this.buildVariableStruct(variable);
                    }, this);
                    this.db.collection('contracts').doc(this.hash).update({ storageStructure: JSON.stringify(storageStructure) }).then(resolve);
                }); 
            })
        },
        readVariables: function(transaction, blockNumber = 'latest') {
            if (!this.instanceDecoder || !transaction) {
                return;
            }
            this.instanceDecoder.variables(blockNumber).then((res) => {
                var hist = {};
                res.forEach(variable => Object.assign(hist, this.buildVariableTree(variable)));
                this.db.collection('transactions')
                    .doc(transaction.hash)
                    .update({ storage: JSON.stringify(hist, null, 2)});
            });
        },
        buildVariableTree: function(variable, tree = {}) {
            var name = `${this.findVariableName(variable)}`;
            switch(variable.value.type.typeClass) {
                case 'uint':
                    tree[name] = variable.value.value.asBN.toString();
                    break;
                case 'mapping':
                    if (!tree.name) {
                        tree[name] = {}
                    }
                    for (var i = 0; i < variable.value.value.length; i++) {
                        this.buildVariableTree(variable.value.value[i], tree[name]);
                    }
                    break;
                case 'array':
                    tree[name] = [];
                    for (var j = 0; j < variable.value.value.length; j++) {
                        tree[name].push(this.buildArrayChild(variable.value.value[j]))
                    }
                    break;
            }
            return tree;
        },
        buildArrayChild: function(variable) {
            var res = '';
            var base = variable.type ? variable : variable.value;

            switch(base.type.typeClass) {
                case 'uint':
                    res = base.value.asBN.toString();
                    break;
                case 'address':
                    res = base.value.asAddress;
                    break;
                case 'struct':
                    res = {};
                    for (var i = 0; i < base.value.length; i++) {
                        res[base.value[i].name] = this.buildArrayChild(base.value[i]);
                    }
                    break;
            }

            return res;
        },
        buildVariableStruct: function(variable, path = []) {
            var label = '';
            var key = variable.name;
            var children = null;
            path.push(key);
            switch(variable.value.type.typeClass) {
                case 'uint':
                    label = `${variable.value.type.typeHint} ${variable.name};`;
                    break;
                case 'mapping':
                    label = `${this.buildMappingLabel(variable.value.type)} ${variable.name}:`;
                    children = [];
                    for (var i = 0; i < variable.value.value.length; i++) {
                        children.push(this.buildMappingChild(variable.value.value[i], [...path]))
                    }
                    break;
                case 'array':
                    var baseType = variable.value.type.baseType;
                    label = `${baseType.typeName ? baseType.typeName : baseType.typeHint}[ ] ${variable.name};`
                    break;
            }
            return {
                path: path,
                index: this.treeIdx++,
                label: label,
                key: key,
                children: children
            }
        },
        buildMappingChild: function(child, path = []) {
            var res = {
                index: this.treeIdx++,
                key: child.key.value.asAddress,
                children: null
            }
            res.path = path;
            res.path.push(res.key);
            switch (child.key.type.typeClass) {
                case 'address':
                    res.label = child.key.value.asAddress
                    break;
                case 'uint':
                    res.label = child.key.value.asBN
                    break;
            }
            switch (child.value.type.typeClass) {
                case 'mapping':
                    res.label += ':';
                    res.children = [];
                    for (var i = 0; i < child.value.value.length; i++) {
                        res.children.push(this.buildMappingChild(child.value.value[i], [...path]));
                    }
                    break;
                default:
                    res.label += ';';
                    break;

            }
            return res;
        },
        buildMappingLabel: function(mapping) {
            var label = 'mapping(';
            label += `${mapping.keyType.typeClass} => `;
            if (mapping.valueType.typeClass == 'mapping') {
                label += this.buildMappingLabel(mapping.valueType);
            }
            else {
                label += mapping.valueType.typeHint;
            }
            label += ')';
            return label;
        },
        findVariableName: function(variable) {
            var name = 'N/A';
            if (variable.name)
                name = variable.name;
            if (variable.key) {
                switch (variable.key.type.typeClass) {
                    case 'address':
                        name = variable.key.value.asAddress;
                        break;
                    case 'uint':
                        name = variable.key.value.asBN;
                        break;
                }
            }

            return name;
        },
        addStorageStructureChild: function(struct, idx, newKey) {
            if (struct.index == idx) {
                this.instanceDecoder.watchMappingKey(...struct.path, newKey).then(this.updateStorageStructure);
            }
            else if (struct.children && struct.children.length) {
                struct.children.forEach(function(child) {
                    this.addStorageStructureChild(child, idx, newKey);
                }, this);
            }
        },
        watchStorageStructure: function(struct) {
            if (struct.children) {
                struct.children.forEach((child) => this.watchStorageStructure(child), this);
            }
            this.instanceDecoder.watchMappingKey(...struct.path);
        },
        handleContractArtifact: function() {
            this.jsonInterface = new ethers.utils.Interface(this.contract.artifact.abi);
            this.contractInstance = new this.web3.eth.Contract(this.contract.artifact.abi, this.hash);
            this.contract.artifact.web3 = this.web3;
            
            if (this.dependenciesNeded()) {
                return;
            }

            this.decodeContract();
        },
        decodeContract: function() {
            var dependencies = Object.entries(this.contract.dependencies).map(dep => JSON.parse(dep[1].artifact));
            Decoder.forContract(this.contract.artifact, dependencies)
                .then(decoder => decoder.forInstance()
                    .then(instanceDecoder => {
                        this.instanceDecoder = instanceDecoder;
                        if (!this.contract.storageStructure) {
                            this.updateStorageStructure().then(() => {
                                Object.entries(this.contract.storageStructure).map(entry => this.watchStorageStructure(entry[1]));
                            })
                        }
                        else {
                            Object.entries(this.contract.storageStructure).map(entry => this.watchStorageStructure(entry[1]));
                        }
                    })
                )
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
                this.$bind('contract', this.db.collection('contracts').doc(hash), this.db.contractSerializer).then(() => {
                    if (!this.contract || !this.contract.artifact) {
                        return;
                    }
                    this.handleContractArtifact();
                    this.db.collection('transactions').where('to', '==', hash).onSnapshot((snapshot) => {
                        snapshot.docChanges().forEach((change) => {
                            if (change.type == 'added') {
                                var tx = change.doc.data();
                                if (!tx.storage) {
                                    this.readVariables(tx, tx.blockNumber);
                                }
                            }
                        })
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
            if (!this.contract.artifact) {
                return [];
            }
            return this.contract.artifact.abi.filter(member => member.type == 'function' && member.stateMutability == 'view');
        },
        contractWriteMethods: function() {
            if (!this.contract.artifact) {
                return [];
            }
            return this.contract.artifact.abi.filter(member => member.type == 'function' && member.stateMutability != 'view');
        }
    }
}
</script>
