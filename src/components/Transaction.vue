<template>
    <v-container fluid>
        <template v-if="loading">
            <v-row>
                <v-col>
                    <h2 class="text-h5 font-weight-medium mb-4">Transaction Details</h2>
                </v-col>
            </v-row>
            <v-card>
                <v-card-text>
                    <v-skeleton-loader type="list-item-three-line"></v-skeleton-loader>
                    <v-skeleton-loader type="list-item-three-line"></v-skeleton-loader>
                    <v-skeleton-loader type="list-item-three-line"></v-skeleton-loader>
                </v-card-text>
            </v-card>
        </template>
        <template v-else-if="transaction.hash && !loading">
            <v-row>
                <v-col>
                    <v-alert density="compact" text type="warning" class="my-2" v-if="transaction.state == 'syncing'">
                        Transaction has been picked up by the indexer, and is currently still being processed.
                        Once it's finished, additional data will be displayed.
                    </v-alert>
                    <h2 class="text-h5 font-weight-medium mb-4">Transaction Details</h2>
                </v-col>
                <template v-if="!explorerStore.id">
                    <v-spacer></v-spacer>
                    <v-col align="right">
                        <v-progress-circular v-show="processing" indeterminate class="mr-2" size="16" width="2" color="primary"></v-progress-circular>
                        <v-menu :location="true ? 'right' : undefined">
                            <template v-slot:activator="{ props }">
                                <v-btn icon v-bind="props">
                                    <v-icon>mdi-dots-vertical</v-icon>
                                </v-btn>
                            </template>
                            <v-list>
                                <v-list-item :disabled="!transaction.hash || processing" link @click="reprocessTransaction()">Reprocess Transaction</v-list-item>
                            </v-list>
                        </v-menu>
                    </v-col>
                </template>
            </v-row>

            <!-- Transaction Action Summary -->
            <v-card class="mb-4" v-if="transaction.to && transaction.value > 0">
                <v-card-text class="py-2">
                    <div class="d-flex align-center">
                        <v-icon color="primary" class="mr-2">mdi-swap-horizontal</v-icon>
                        <span>
                            Transfer {{ $fromWei(transaction.value, 'ether', currentWorkspaceStore.chain.token) }} 
                            from 
                            <Hash-Link :type="'address'" :hash="transaction.from" :shortHash="true" /> 
                            to 
                            <Hash-Link :type="'address'" :hash="transaction.to" :shortHash="true" :withName="true" :contract="transaction.contract" />
                        </span>
                            </div>
                        </v-card-text>
                    </v-card>

            <!-- Error Alert -->
            <v-alert v-if="transaction.parsedError || transaction.rawError" type="error" class="mb-4" variant="tonal">
                <div v-if="transaction.parsedError">{{ transaction.parsedError }}</div>
                <div v-else>
                    <b>Couldn't parse error message. Raw data:</b>
                    <div style="white-space: pre-wrap;" class="mt-1">
                        {{ JSON.stringify(transaction.rawError, null, '\t\t') }}
                    </div>
                </div>
            </v-alert>

            <!-- Transaction Information Card (without header) -->
            <v-card class="mb-6" variant="outlined">
                <v-card-text class="pa-0">
                    <v-list density="compact" class="transaction-list">
                        <!-- Transaction Hash -->
                        <v-list-item>
                            <template v-slot:prepend>
                                <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                                    <v-tooltip location="top">
                                        <template v-slot:activator="{ props }">
                                            <v-icon size="small" color="grey" class="mr-1" v-bind="props">mdi-help-circle-outline</v-icon>
                                        </template>
                                        <span>The unique identifier for this transaction</span>
                                    </v-tooltip>
                                    Transaction Hash:
                                </div>
                            </template>
                            <v-list-item-title class="text-body-2 text-truncate">
                                <Hash-Link v-if="transaction.hash" :type="'tx'" :hash="transaction.hash" :fullHash="true" />
                                <span v-else>-</span>
                            </v-list-item-title>
                        </v-list-item>

                        <!-- Status -->
                        <v-list-item>
                            <template v-slot:prepend>
                                <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                                    <v-tooltip location="top">
                                        <template v-slot:activator="{ props }">
                                            <v-icon size="small" color="grey" class="mr-1" v-bind="props">mdi-help-circle-outline</v-icon>
                                        </template>
                                        <span>The status of the transaction: Success, Failed, or Unknown</span>
                                    </v-tooltip>
                                    Status:
                                </div>
                            </template>
                            <v-list-item-title class="text-body-2">
                                <v-chip
                                    size="small"
                                    :color="txStatus == 'succeeded' ? 'success' : txStatus == 'failed' ? 'error' : 'grey'"
                                    text-color="white"
                                    class="font-weight-medium"
                                >
                                    {{ txStatus == 'succeeded' ? 'Success' : txStatus == 'failed' ? 'Failed' : 'Unknown' }}
                                </v-chip>
                            </v-list-item-title>
                        </v-list-item>

                        <!-- Block -->
                        <v-list-item>
                            <template v-slot:prepend>
                                <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                                    <v-tooltip location="top">
                                        <template v-slot:activator="{ props }">
                                            <v-icon size="small" color="grey" class="mr-1" v-bind="props">mdi-help-circle-outline</v-icon>
                                        </template>
                                        <span>The block number in which this transaction was included</span>
                                    </v-tooltip>
                                    Block:
                                </div>
                            </template>
                            <v-list-item-title class="text-body-2">
                                <router-link v-if="transaction.blockNumber" style="text-decoration: none;" :to="'/block/' + transaction.blockNumber">{{ commify(transaction.blockNumber) }}</router-link>
                                <span v-else>-</span>
                                <span v-if="currentWorkspaceStore.currentBlock.number && transaction.blockNumber" class="ml-2 confirmation-text">
                                    ({{ commify(currentWorkspaceStore.currentBlock.number - transaction.blockNumber) }} Block Confirmations)
                                </span>
                            </v-list-item-title>
                        </v-list-item>

                        <!-- Timestamp -->
                        <v-list-item>
                            <template v-slot:prepend>
                                <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                                    <v-tooltip location="top">
                                        <template v-slot:activator="{ props }">
                                            <v-icon size="small" color="grey" class="mr-1" v-bind="props">mdi-help-circle-outline</v-icon>
                                        </template>
                                        <span>The date and time at which this transaction was mined</span>
                                    </v-tooltip>
                                    Timestamp:
                                </div>
                            </template>
                            <v-list-item-title class="text-body-2">
                                {{ transaction.timestamp ? `${shortDate(transaction.timestamp)} (${fromNow(transaction.timestamp)})` : '-' }}
                            </v-list-item-title>
                        </v-list-item>

                        <!-- Custom divider -->
                        <div class="custom-divider"></div>

                        <!-- From -->
                        <v-list-item>
                            <template v-slot:prepend>
                                <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                                    <v-tooltip location="top">
                                        <template v-slot:activator="{ props }">
                                            <v-icon size="small" color="grey" class="mr-1" v-bind="props">mdi-help-circle-outline</v-icon>
                                        </template>
                                        <span>The sending address of the transaction</span>
                                    </v-tooltip>
                                    From:
                                </div>
                            </template>
                            <v-list-item-title class="text-body-2 text-truncate">
                                <Hash-Link v-if="transaction.from" :type="'address'" :hash="transaction.from" :fullHash="true" />
                                <span v-else>-</span>
                            </v-list-item-title>
                        </v-list-item>

                        <!-- To / Contract Created -->
                        <v-list-item v-if="transaction.to">
                            <template v-slot:prepend>
                                <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                                    <v-tooltip location="top">
                                        <template v-slot:activator="{ props }">
                                            <v-icon size="small" color="grey" class="mr-1" v-bind="props">mdi-help-circle-outline</v-icon>
                                        </template>
                                        <span>The receiving address of the transaction</span>
                                    </v-tooltip>
                                    To:
                                </div>
                            </template>
                            <v-list-item-title class="text-body-2 text-truncate">
                    <Hash-Link :type="'address'" :hash="transaction.to" :fullHash="true" :withName="true" :contract="transaction.contract" />
                            </v-list-item-title>
                        </v-list-item>
                        <v-list-item v-else>
                            <template v-slot:prepend>
                                <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                                    <v-tooltip location="top">
                                        <template v-slot:activator="{ props }">
                                            <v-icon size="small" color="grey" class="mr-1" v-bind="props">mdi-help-circle-outline</v-icon>
                                        </template>
                                        <span>The address of the contract created by this transaction</span>
                                    </v-tooltip>
                                    Contract Created:
                                </div>
                            </template>
                            <v-list-item-title class="text-body-2 text-truncate">
                                <Hash-Link v-if="transaction.receipt && transaction.receipt.contractAddress" :type="'address'" :hash="transaction.receipt.contractAddress" :fullHash="true" :withName="true" />
                                <span v-else>-</span>
                            </v-list-item-title>
                        </v-list-item>

                        <!-- Custom divider -->
                        <div class="custom-divider"></div>

                        <!-- Value -->
                        <v-list-item>
                            <template v-slot:prepend>
                                <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                                    <v-tooltip location="top">
                                        <template v-slot:activator="{ props }">
                                            <v-icon size="small" color="grey" class="mr-1" v-bind="props">mdi-help-circle-outline</v-icon>
                                        </template>
                                        <span>The amount of native tokens transferred in this transaction</span>
                                    </v-tooltip>
                                    Value:
                                </div>
                            </template>
                            <v-list-item-title class="text-body-2">
                                {{ transaction.value ? $fromWei(transaction.value, 'ether', currentWorkspaceStore.chain.token) : '0 ' + currentWorkspaceStore.chain.token }}
                            </v-list-item-title>
                        </v-list-item>

                        <!-- Transaction Fee -->
                        <v-list-item v-if="transaction.receipt">
                            <template v-slot:prepend>
                                <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                                    <v-tooltip location="top">
                                        <template v-slot:activator="{ props }">
                                            <v-icon size="small" color="grey" class="mr-1" v-bind="props">mdi-help-circle-outline</v-icon>
                                        </template>
                                        <span>The fee paid for this transaction (Gas Used × Gas Price)</span>
                                    </v-tooltip>
                                    Transaction Fee:
                                </div>
                            </template>
                            <v-list-item-title class="text-body-2">
                                {{ transaction.receipt.gasUsed ? $fromWei(transaction.receipt.gasUsed * getGasPriceFromTx(transaction), 'ether', currentWorkspaceStore.chain.token) : '-' }}
                            </v-list-item-title>
                        </v-list-item>

                        <!-- Gas Price -->
                        <v-list-item>
                            <template v-slot:prepend>
                                <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                                    <v-tooltip location="top">
                                        <template v-slot:activator="{ props }">
                                            <v-icon size="small" color="grey" class="mr-1" v-bind="props">mdi-help-circle-outline</v-icon>
                                        </template>
                                        <span>The price per unit of gas specified for this transaction</span>
                                    </v-tooltip>
                                    Gas Price:
                                </div>
                            </template>
                            <v-list-item-title class="text-body-2">
                                {{ transaction.gasPrice ? $fromWei(getGasPriceFromTx(transaction), 'gwei', 'gwei') : '-' }}
                            </v-list-item-title>
                        </v-list-item>

                        <!-- Custom divider -->
                        <div class="custom-divider"></div>

                        <!-- Gas Limit & Usage -->
                        <v-list-item>
                            <template v-slot:prepend>
                                <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                                    <v-tooltip location="top">
                                        <template v-slot:activator="{ props }">
                                            <v-icon size="small" color="grey" class="mr-1" v-bind="props">mdi-help-circle-outline</v-icon>
                                        </template>
                                        <span>The maximum amount of gas allocated for this transaction and the actual amount used</span>
                                    </v-tooltip>
                                    Gas Limit & Usage:
                                </div>
                            </template>
                            <v-list-item-title class="text-body-2" v-if="transaction.receipt && transaction.gasLimit">
                                {{ parseInt(transaction.gasLimit).toLocaleString() }} | {{ parseInt(transaction.receipt.gasUsed).toLocaleString() }} ({{ Math.round(transaction.receipt.gasUsed / transaction.gasLimit * 100) }}%)
                            </v-list-item-title>
                            <v-list-item-title class="text-body-2" v-else-if="transaction.gasLimit">
                            {{ parseInt(transaction.gasLimit || transaction.block.gasLimit).toLocaleString() }}
                            </v-list-item-title>
                            <v-list-item-title class="text-body-2" v-else>
                                -
                            </v-list-item-title>
                        </v-list-item>

                        <!-- Nonce -->
                        <v-list-item>
                            <template v-slot:prepend>
                                <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                                    <v-tooltip location="top">
                                        <template v-slot:activator="{ props }">
                                            <v-icon size="small" color="grey" class="mr-1" v-bind="props">mdi-help-circle-outline</v-icon>
                                        </template>
                                        <span>The transaction count for the sender's address</span>
                                    </v-tooltip>
                                    Nonce:
                                </div>
                            </template>
                            <v-list-item-title class="text-body-2">
                                {{ transaction.nonce !== undefined ? transaction.nonce : '-' }}
                            </v-list-item-title>
                        </v-list-item>

                        <!-- L1 Block if applicable -->
                        <v-list-item v-if="explorerStore.l1Explorer && transaction.block && transaction.block.l1BlockNumber">
                            <template v-slot:prepend>
                                <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                                    <v-tooltip location="top">
                                        <template v-slot:activator="{ props }">
                                            <v-icon size="small" color="grey" class="mr-1" v-bind="props">mdi-help-circle-outline</v-icon>
                                        </template>
                                        <span>The corresponding L1 block for this L2 transaction</span>
                                    </v-tooltip>
                                    L1 Block:
                                </div>
                            </template>
                            <v-list-item-title class="text-body-2">
                            <a :href="`${explorerStore.l1Explorer}/block/${transaction.block.l1BlockNumber}`" target="_blank">{{ commify(transaction.block.l1BlockNumber) }}</a>
                            </v-list-item-title>
                        </v-list-item>

                        <!-- Fee Recipient -->
                        <v-list-item v-if="transaction.miner">
                            <template v-slot:prepend>
                                <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                                    <v-tooltip location="top">
                                        <template v-slot:activator="{ props }">
                                            <v-icon size="small" color="grey" class="mr-1" v-bind="props">mdi-help-circle-outline</v-icon>
                                        </template>
                                        <span>The address that received the transaction fees.</span>
                                    </v-tooltip>
                                    Fee Recipient:
                                </div>
                            </template>
                            <v-list-item-title class="text-body-2">
                                <router-link :to="{ name: 'address', params: { address: transaction.miner } }">{{ transaction.miner }}</router-link>
                            </v-list-item-title>
                        </v-list-item>

                        <!-- Extra Fields -->
                        <v-list-item v-for="(field, idx) in transaction.extraFields" :key="idx">
                            <template v-slot:prepend>
                                <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                                    <v-tooltip location="top" v-if="field.title">
                                        <template v-slot:activator="{ props }">
                                            <v-icon size="small" color="grey" class="mr-1" v-bind="props">mdi-help-circle-outline</v-icon>
                                        </template>
                                        <span>{{ field.title }}</span>
                                    </v-tooltip>
                                    {{ field.name }}:
                                </div>
                            </template>
                            <v-list-item-title class="text-body-2">
                            <Custom-Field :name="field.name" :value="field.value" :type="field.type" :label="field.label" :decimals="field.decimals" :symbol="field.symbol" :title="field.title" />
                            </v-list-item-title>
                        </v-list-item>
                    </v-list>
                </v-card-text>
            </v-card>

            <!-- More Details Card (without divider) -->
            <v-card class="mb-6" variant="outlined">
                <v-card-item>
                    <v-card-title class="text-subtitle-1 font-weight-bold">More Details</v-card-title>
                </v-card-item>
                <v-card-text class="pa-0">
                    <v-list density="compact" class="transaction-list">
                        <!-- Gas Limit & Usage by Txn -->
                        <v-list-item>
                            <template v-slot:prepend>
                                <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                                    <v-tooltip location="top">
                                        <template v-slot:activator="{ props }">
                                            <v-icon size="small" color="grey" class="mr-1" v-bind="props">mdi-help-circle-outline</v-icon>
                                        </template>
                                        <span>Gas limit provided by the sender and amount of gas used by the transaction.</span>
                                    </v-tooltip>
                                    Gas Limit & Usage by Txn:
                                </div>
                            </template>
                            <v-list-item-title class="text-body-2">
                                <span v-if="transaction.receipt && transaction.gasLimit">
                                    {{ parseInt(transaction.gasLimit).toLocaleString() }} | {{ parseInt(transaction.receipt.gasUsed).toLocaleString() }} ({{ Math.round(transaction.receipt.gasUsed / transaction.gasLimit * 100) }}%)
                                </span>
                                <span v-else-if="transaction.gasLimit">
                                    {{ parseInt(transaction.gasLimit || transaction.block.gasLimit).toLocaleString() }}
                                </span>
                                <span v-else>-</span>
                            </v-list-item-title>
                        </v-list-item>

                        <!-- Gas Fees -->
                        <v-list-item>
                            <template v-slot:prepend>
                                <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                                    <v-tooltip location="top">
                                        <template v-slot:activator="{ props }">
                                            <v-icon size="small" color="grey" class="mr-1" v-bind="props">mdi-help-circle-outline</v-icon>
                                        </template>
                                        <span>Base Fee refers to the network Base Fee at the time of the block. Max Fee & Max Priority Fee refer to the max amount a user is willing to pay for their tx & to give to the block producer respectively.</span>
                                    </v-tooltip>
                                    Gas Fees:
                                </div>
                            </template>
                            <v-list-item-title class="text-body-2">
                                Base: <span class="text-primary">{{ transaction.baseFeePerGas ? $fromWei(transaction.baseFeePerGas, 'gwei', 'gwei') : '0' }} Gwei</span> | 
                                Max: <span class="text-primary">{{ transaction.maxFeePerGas ? $fromWei(transaction.maxFeePerGas, 'gwei', 'gwei') : $fromWei(getGasPriceFromTx(transaction), 'gwei', 'gwei') }} Gwei</span> | 
                                Max Priority: <span class="text-primary">{{ transaction.maxPriorityFeePerGas ? $fromWei(transaction.maxPriorityFeePerGas, 'gwei', 'gwei') : '0' }} Gwei</span>
                            </v-list-item-title>
                        </v-list-item>

                        <!-- Burnt & Txn Savings Fees -->
                        <v-list-item>
                            <template v-slot:prepend>
                                <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                                    <v-tooltip location="top">
                                        <template v-slot:activator="{ props }">
                                            <v-icon size="small" color="grey" class="mr-1" v-bind="props">mdi-help-circle-outline</v-icon>
                                        </template>
                                        <span>Burnt fees are the amount of ETH burned (Base Fee × Gas Used) as part of EIP-1559. Txn Savings are the total fees saved from the amount the user was willing to pay.</span>
                                    </v-tooltip>
                                    Burnt & Txn Savings Fees:
                                </div>
                            </template>
                            <v-list-item-title class="text-body-2">
                                <span class="text-error mr-2"><v-icon size="small" color="error" class="mr-1">mdi-fire</v-icon>Burnt: {{ calculateBurntFees() }}</span>
                                <span class="text-success"><v-icon size="small" color="success" class="mr-1">mdi-cash</v-icon>Txn Savings: {{ calculateTxnSavings() }}</span>
                            </v-list-item-title>
                        </v-list-item>

                        <!-- Custom divider -->
                        <div class="custom-divider"></div>

                        <!-- Other Attributes -->
                        <v-list-item>
                            <template v-slot:prepend>
                                <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                                    <v-tooltip location="top">
                                        <template v-slot:activator="{ props }">
                                            <v-icon size="small" color="grey" class="mr-1" v-bind="props">mdi-help-circle-outline</v-icon>
                                        </template>
                                        <span>Additional transaction attributes including transaction type, nonce, and position in block.</span>
                                    </v-tooltip>
                                    Other Attributes:
                                </div>
                            </template>
                            <v-list-item-title class="text-body-2">
                                <v-chip
                                    size="small"
                                    color="grey-darken-2"
                                    text-color="white"
                                    class="font-weight-medium mr-2"
                                    density="comfortable"
                                >
                                    Txn Type: {{ transaction.type || '0' }} ({{ getTxnTypeName(transaction.type) }})
                                </v-chip>
                                <v-chip
                                    size="small"
                                    color="grey-darken-2"
                                    text-color="white"
                                    class="font-weight-medium mr-2"
                                    density="comfortable"
                                >
                                    Nonce: {{ transaction.nonce !== undefined ? transaction.nonce : '-' }}
                                </v-chip>
                                <v-chip
                                    size="small"
                                    color="grey-darken-2"
                                    text-color="white"
                                    class="font-weight-medium"
                                    density="comfortable"
                                >
                                    Position In Block: {{ transaction.transactionIndex !== undefined ? transaction.transactionIndex : '-' }}
                                </v-chip>
                            </v-list-item-title>
                        </v-list-item>
                    </v-list>
                </v-card-text>
            </v-card>

            <!-- Token Transfers -->
            <v-card class="mb-6" v-if="transaction.tokenTransferCount > 0" variant="outlined">
                <v-card-item>
                    <v-card-title class="text-subtitle-1 font-weight-bold">Token Transfers</v-card-title>
                </v-card-item>
                <v-divider></v-divider>
                        <v-card-text>
                            <Transaction-Token-Transfers :hash="transaction.hash" :withTokenData="true" />
                        </v-card-text>
                    </v-card>

            <!-- Balance Changes -->
            <v-card class="mb-6" v-if="Object.keys(transaction.formattedBalanceChanges).length > 0" variant="outlined">
                <v-card-item>
                    <v-card-title class="text-subtitle-1 font-weight-bold">Balance Changes</v-card-title>
                </v-card-item>
                <v-divider></v-divider>
                <v-card-text>
                    <Tokens-Balance-Diff v-for="(token, idx) in Object.keys(transaction.formattedBalanceChanges)"
                        :token="token"
                        :balanceChanges="transaction.formattedBalanceChanges[token]"
                        :blockNumber="transaction.blockNumber"
                        :key="idx" />
                </v-card-text>
            </v-card>

            <!-- Transaction Data -->
            <Transaction-Data :transaction="transaction" :withoutStorageHeader="false" />

            <!-- Trace -->
            <v-card class="mb-6" v-if="transaction.traceSteps.length" variant="outlined">
                <v-card-item>
                    <v-card-title class="text-subtitle-1 font-weight-bold">Trace</v-card-title>
                </v-card-item>
                <v-divider></v-divider>
                <v-card-text>
                            <Trace-Step v-for="step in transaction.traceSteps" :step="step" :key="step.id" />
                        </v-card-text>
                    </v-card>
        </template>
        <template v-else>
            <h2 class="text-h5 font-weight-medium mb-4">Transaction Details</h2>
            <v-card>
                <v-card-text>
                    <div class="d-flex align-center justify-center py-8">
                        <v-icon size="large" color="grey-lighten-1" class="mr-4">mdi-alert-circle-outline</v-icon>
                        <span class="text-body-1">
                    Cannot find transaction. If you just sent it, it might not have been picked up yet by our indexer.
                    This page will refresh automatically as soon as we find it.
                        </span>
                    </div>
                </v-card-text>
            </v-card>
        </template>
    </v-container>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, inject } from 'vue';
import moment from 'moment';
import * as ethers from 'ethers';
import { storeToRefs } from 'pinia';
import { useExplorerStore } from '../stores/explorer';
import { useCurrentWorkspaceStore } from '../stores/currentWorkspace';
import { getGasPriceFromTransaction } from '../lib/utils';
import HashLink from './HashLink.vue';
import TransactionData from './TransactionData.vue';
import TraceStep from './TraceStep.vue';
import TransactionTokenTransfers from './TransactionTokenTransfers.vue';
import TokensBalanceDiff from './TokensBalanceDiff.vue';
import CustomField from './CustomField.vue';

const props = defineProps(['hash']);

// Inject all required globals
const $server = inject('$server');
const $pusher = inject('$pusher');
const $fromWei = inject('$fromWei');
const $dt = inject('$dt');

// Stores
const explorerStore = useExplorerStore();
const currentWorkspaceStore = useCurrentWorkspaceStore();

// Reactive state
const contract = ref(null);
const transaction = ref({
    error: '',
    value: 0,
    gasPrice: 0,
    gasLimit: 0,
    trace: null,
    tokenTransferCount: 0,
    receipt: {
        gasUsed: 0,
        logs: []
    },
    formattedTokenBalanceChanges: {},
    block: {},
    contract: {},
    traceSteps: []
});
const processing = ref(false);
const loading = ref(false);
let pusherUnsubscribe = null;

// Computed
const txStatus = computed(() => {
    if (!transaction.value.receipt) return 'unknown';

    const receipt = transaction.value.receipt;
    if (receipt.status !== null && receipt.status !== undefined) {
        return receipt.status ? 'succeeded' : 'failed';
    }

    if (receipt.root && receipt.root != '0x' && parseInt(receipt.cumulativeGasUsed) >= parseInt(receipt.gasUsed)) {
        return 'succeeded';
    }

    return 'failed';
});

// Methods
const loadTransaction = async (hash) => {
    loading.value = true;
    console.log('Loading transaction:', hash);
    try {
        const { data } = await $server.getTransaction(hash);
        console.log('Transaction data:', data);
        transaction.value = data;
    } catch (error) {
        console.error('Error loading transaction:', error);
    } finally {
        loading.value = false;
    }
};

const reprocessTransaction = async () => {
    processing.value = true;
    console.log('Reprocessing transaction:', props.hash);
    try {
        await $server.reprocessTransaction(props.hash);
        if (!explorerStore.id) {
            console.log('Processing transaction in workspace:', currentWorkspaceStore);
            await $server.processTransaction(currentWorkspaceStore, transaction.value);
        }
    } catch (error) {
        console.error('Error reprocessing:', error);
    } finally {
        processing.value = false;
    }
};

// Lifecycle hooks
onMounted(() => {
    pusherUnsubscribe = $pusher.onNewTransaction(data => {
        if (data.hash === props.hash) {
            loadTransaction(props.hash);
        }
    });
});

onUnmounted(() => {
    if (pusherUnsubscribe) {
        pusherUnsubscribe();
    }
});

// Watch
watch(() => props.hash, (hash) => {
    loadTransaction(hash);
}, { immediate: true });

// Make utilities available to template
const commify = ethers.utils.commify;

// Expose dt methods used in template
const shortDate = (timestamp) => $dt.shortDate(timestamp);
const fromNow = (timestamp) => $dt.fromNow(timestamp);

// Expose getGasPriceFromTransaction for template use
const getGasPriceFromTx = getGasPriceFromTransaction;

// Additional methods
const calculateBurntFees = () => {
    if (!transaction.value.receipt || !transaction.value.receipt.gasUsed || !transaction.value.receipt.cumulativeGasUsed) return '0';
    const baseFeePerGas = transaction.value.receipt.baseFeePerGas || 0;
    const gasUsed = transaction.value.receipt.gasUsed;
    const cumulativeGasUsed = transaction.value.receipt.cumulativeGasUsed;
    const burntFees = baseFeePerGas * gasUsed;
    const burntFeesCumulative = baseFeePerGas * cumulativeGasUsed;
    return $fromWei(burntFees, 'ether', currentWorkspaceStore.chain.token);
};

const calculateTxnSavings = () => {
    if (!transaction.value.receipt || !transaction.value.receipt.gasUsed || !transaction.value.receipt.cumulativeGasUsed) return '0';
    const baseFeePerGas = transaction.value.receipt.baseFeePerGas || 0;
    const gasUsed = transaction.value.receipt.gasUsed;
    const cumulativeGasUsed = transaction.value.receipt.cumulativeGasUsed;
    const burntFees = baseFeePerGas * gasUsed;
    const burntFeesCumulative = baseFeePerGas * cumulativeGasUsed;
    const txnSavings = burntFeesCumulative - burntFees;
    return $fromWei(txnSavings, 'ether', currentWorkspaceStore.chain.token);
};

const getTxnTypeName = (type) => {
    const typeName = {
        0: 'Legacy',
        1: 'EIP-2930',
        2: 'EIP-1559'
    }[type];
    return typeName || 'Unknown';
};
</script>

<style scoped>
.transaction-list :deep(.v-list-item) {
    min-height: 48px;
    padding-top: 8px;
    padding-bottom: 8px;
    /* Remove the border from all items */
    border-bottom: none;
}

.v-theme--dark .transaction-list :deep(.v-list-item) {
    /* Remove the border from all items in dark mode */
    border-bottom: none;
}

/* Custom styling for confirmation text */
.confirmation-text {
    color: rgba(0, 0, 0, 0.6);
    font-size: 0.875rem;
}

.v-theme--dark .confirmation-text {
    color: rgba(255, 255, 255, 0.6);
}

/* Custom styling for confirmation chip to match Etherscan */
:deep(.confirmation-chip) {
    border-radius: 4px !important;
    padding: 0 6px !important;
    font-size: 11px !important;
    height: 20px !important;
    font-weight: normal !important;
    margin-top: -1px !important;
    line-height: 1 !important;
    border-width: 1px !important;
    letter-spacing: 0 !important;
    background-color: rgba(0, 0, 0, 0.03) !important;
    border-color: rgba(0, 0, 0, 0.12) !important;
}

.v-theme--dark :deep(.confirmation-chip) {
    color: rgba(255, 255, 255, 0.7) !important;
    background-color: rgba(255, 255, 255, 0.05) !important;
    border-color: rgba(255, 255, 255, 0.12) !important;
}

/* Custom divider styling */
.custom-divider {
    height: 1px;
    background-color: rgba(0, 0, 0, 0.12);
    margin: 8px 0;
    margin-left: 16px; /* Align with the beginning of the help icon */
    margin-right: 24px;
}

.v-theme--dark .custom-divider {
    background-color: rgba(255, 255, 255, 0.12);
}

/* Enhanced styling for cards */
:deep(.v-card) {
    border-radius: 12px !important;
    box-shadow: 0 8px 24px rgba(var(--v-theme-primary), 0.15) !important;
    border: 1px solid rgb(var(--v-theme-primary), 0.2) !important;
    background-color: white !important;
    margin-bottom: 20px !important;
}

.v-theme--dark :deep(.v-card) {
    background-color: rgb(30, 30, 30) !important;
}
</style>
