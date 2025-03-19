<template>
  <div class="overview-tab-content">
    <!-- Transaction Information Card (without header) -->
    <v-card class="mb-6">
      <v-card-text class="pa-0">
        <v-list density="compact" class="transaction-list">
          <!-- Transaction Hash -->
          <v-list-item>
            <template v-slot:prepend>
              <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                <v-icon size="small" color="grey" class="mr-1" v-tooltip="'The unique identifier for this transaction'">mdi-help-circle-outline</v-icon>
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
                <v-icon size="small" color="grey" class="mr-1" v-tooltip="'The status of the transaction: Success, Failed, or Unknown'">mdi-help-circle-outline</v-icon>
                Status:
              </div>
            </template>
            <v-list-item-title class="text-body-2">
              <v-chip
                :prepend-icon="txStatus == 'succeeded' ? 'mdi-check' : txStatus == 'failed' ? 'mdi-close' : (!transaction.receipt ? undefined : 'mdi-help-circle')"
                size="small"
                :color="txStatus == 'succeeded' ? 'success' : txStatus == 'failed' ? 'error' : 'grey'"
                text-color="white"
                class="font-weight-medium"
              >
                <v-progress-circular v-if="!transaction.receipt" indeterminate size="16" width="2" color="white" class="mr-2 slow-spin"></v-progress-circular>
                {{ !transaction.receipt ? 'Pending' : txStatus == 'succeeded' ? 'Success' : txStatus == 'failed' ? 'Failed' : 'Unknown' }}
              </v-chip>
              <!-- Error message display - updated to use v-alert -->
              <v-alert
                v-if="txStatus === 'failed' && (transaction.parsedError || transaction.rawError)"
                density="compact"
                class="mt-2"
                border="start"
                border-color="error"
                :color="'rgba(var(--v-theme-error), 0.05)'"
                :icon="false">
                <template #text>
                    <span v-if="transaction.parsedError" class="text-error">Error: '{{ transaction.parsedError }}'</span>
                    <div v-else class="text-error">
                        <span class="font-weight-medium">Couldn't parse error. Raw message:</span>
                        <Expandable-Text :maxChars="100">
                            <pre>{{ JSON.stringify(JSON.parse(transaction.rawError), null, 2) }}</pre>
                        </Expandable-Text>
                    </div>
                </template>
              </v-alert>
            </v-list-item-title>
          </v-list-item>

          <!-- Block -->
          <v-list-item>
            <template v-slot:prepend>
              <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                <v-icon size="small" color="grey" class="mr-1" v-tooltip="'The block number in which this transaction was included'">mdi-help-circle-outline</v-icon>
                Block:
              </div>
            </template>
            <v-list-item-title class="text-body-2">
              <router-link v-if="transaction.blockNumber" style="text-decoration: none;" :to="'/block/' + transaction.blockNumber">{{ commify(transaction.blockNumber) }}</router-link>
              <span v-else>-</span>
              <span v-if="currentWorkspaceStore.currentBlock && currentWorkspaceStore.currentBlock.number && transaction.blockNumber" class="ml-2 confirmation-text">
                <v-chip size="small" color="grey-darken-2" text-color="white" class="font-weight-medium mr-2" density="comfortable">
                  {{ commify(currentWorkspaceStore.currentBlock.number - transaction.blockNumber) }} Block Confirmations
                </v-chip>
              </span>
            </v-list-item-title>
          </v-list-item>

          <!-- Timestamp -->
          <v-list-item>
            <template v-slot:prepend>
              <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                <v-icon size="small" color="grey" class="mr-1" v-tooltip="'The date and time at which this transaction was mined'">mdi-help-circle-outline</v-icon>
                Timestamp:
              </div>
            </template>
            <v-list-item-title class="text-body-2">
                <template v-if="transaction.timestamp">
                    {{ `${$dt.shortDate(transaction.timestamp)}` }}<span class="text-medium-emphasis"> ({{ $dt.fromNow(transaction.timestamp) }})</span>
                </template>
                <template v-else>
                    -
                </template>
            </v-list-item-title>
          </v-list-item>

          <!-- Only one divider between timestamp and token/balance sections -->
          <v-divider class="mx-4"></v-divider>

          <!-- Token Transfers Section (if any) -->
          <template v-if="transaction.tokenTransferCount && transaction.tokenTransferCount > 0">
            <v-list-item class="token-transfers-item">
              <template v-slot:prepend>
                <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                  <v-icon size="small" color="grey" class="mr-1" v-tooltip="'Tokens transferred in this transaction'">mdi-help-circle-outline</v-icon>
                  Token Transfers:
                </div>
              </template>
              <v-list-item-title class="text-body-2 token-activity-container">
                <div class="token-transfers-wrapper">
                  <!-- Token Transfers -->
                  <Compact-Transaction-Token-Transfers 
                    :hash="transaction.hash" 
                    :withTokenData="true"
                    :address="transaction.from"
                    :embedded="true"
                  />
                </div>
              </v-list-item-title>
            </v-list-item>
            <v-divider class="mx-4"></v-divider>
          </template>

          <!-- Balance Changes Section (if any) -->
          <template v-if="transaction.formattedBalanceChanges && Object.keys(transaction.formattedBalanceChanges).length > 0">
            <v-list-item class="balance-changes-item">
              <template v-slot:prepend>
                <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                  <v-icon size="small" color="grey" class="mr-1" v-tooltip="'Token balance changes resulting from this transaction'">mdi-help-circle-outline</v-icon>
                  Balance Changes:
                </div>
              </template>
              <v-list-item-title class="text-body-2 token-activity-container">
                <div class="integrated-balance-changes">
                  <Tokens-Balance-Diff
                    :balanceChanges="Object.entries(transaction.formattedBalanceChanges || {}).reduce((acc, [token, changes]) => {
                      return acc.concat(changes.map(change => ({...change, token})))
                    }, [])"
                    :blockNumber="transaction.blockNumber" 
                    :embedded="true"
                    :showAll="showAllBalanceChanges"
                    @view-all="showAllBalanceChanges = true"/>
                </div>
              </v-list-item-title>
            </v-list-item>
            <v-divider class="mx-4"></v-divider>
          </template>

          <!-- From -->
          <v-list-item>
            <template v-slot:prepend>
              <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                <v-icon size="small" color="grey" class="mr-1" v-tooltip="'The sending address of the transaction'">mdi-help-circle-outline</v-icon>
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
                <v-icon size="small" color="grey" class="mr-1" v-tooltip="'The receiving address of the transaction'">mdi-help-circle-outline</v-icon>
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
                <v-icon size="small" color="grey" class="mr-1" v-tooltip="'The address of the contract created by this transaction'">mdi-help-circle-outline</v-icon>
                Contract Created:
              </div>
            </template>
            <v-list-item-title class="text-body-2 text-truncate">
              <Hash-Link v-if="transaction.receipt && transaction.receipt.contractAddress" :type="'address'" :hash="transaction.receipt.contractAddress" :fullHash="true" :withName="true" />
              <span v-else>-</span>
            </v-list-item-title>
          </v-list-item>

          <!-- Custom divider -->
          <v-divider class="mx-4"></v-divider>

          <!-- Value -->
          <v-list-item>
            <template v-slot:prepend>
              <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                <v-icon size="small" color="grey" class="mr-1" v-tooltip="'The amount of native tokens transferred in this transaction'">mdi-help-circle-outline</v-icon>
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
                <v-icon size="small" color="grey" class="mr-1" v-tooltip="'The fee paid for this transaction (Gas Used × Gas Price)'">mdi-help-circle-outline</v-icon>
                Transaction Fee:
              </div>
            </template>
            <v-list-item-title class="text-body-2">
              {{ transaction.receipt && transaction.receipt.gasUsed ? $fromWei(transaction.receipt.gasUsed * getGasPriceFromTx(transaction), 'ether', currentWorkspaceStore.chain.token) : '-' }}
            </v-list-item-title>
          </v-list-item>

          <!-- Gas Price -->
          <v-list-item>
            <template v-slot:prepend>
              <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                <v-icon size="small" color="grey" class="mr-1" v-tooltip="'The price per unit of gas specified for this transaction'">mdi-help-circle-outline</v-icon>
                Gas Price:
              </div>
            </template>
            <v-list-item-title class="text-body-2">
              {{ transaction.gasPrice ? $fromWei(getGasPriceFromTx(transaction), 'gwei', 'gwei') : '-' }}
            </v-list-item-title>
          </v-list-item>

          <!-- L1 Block if applicable -->
          <v-list-item v-if="explorerStore.l1Explorer && transaction.block && transaction.block.l1BlockNumber">
            <template v-slot:prepend>
              <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                <v-icon size="small" color="grey" class="mr-1" v-tooltip="'The corresponding L1 block for this L2 transaction'">mdi-help-circle-outline</v-icon>
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
                <v-icon size="small" color="grey" class="mr-1" v-tooltip="'The address that received the transaction fees.'">mdi-help-circle-outline</v-icon>
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
                <v-icon size="small" color="grey" class="mr-1" v-tooltip="field.title">mdi-help-circle-outline</v-icon>
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
    <v-card class="mb-6">
      <v-card-title class="text-subtitle-1 font-weight-bold">More Details</v-card-title>
      <v-card-text class="pa-0">
        <v-list density="compact" class="transaction-list">
          <!-- Gas Limit & Usage by Txn -->
          <v-list-item>
            <template v-slot:prepend>
              <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                <v-icon size="small" color="grey" class="mr-1" v-tooltip="'Gas limit provided by the sender and amount of gas used by the transaction.'">mdi-help-circle-outline</v-icon>
                Gas Limit & Usage by Txn:
              </div>
            </template>
            <v-list-item-title class="text-body-2">
              <span v-if="transaction.gasLimit">
                {{ parseInt(transaction.gasLimit).toLocaleString() }} |
                <template v-if="transaction.receipt">
                  {{ parseInt(transaction.receipt.gasUsed).toLocaleString() }} ({{ Math.round(transaction.receipt.gasUsed / transaction.gasLimit * 100) }}%)
                </template>
                <template v-else>
                  <span class="font-italic">(Pending)</span>
                </template>
              </span>
              <span v-else>-</span>
            </v-list-item-title>
          </v-list-item>

          <!-- Gas Fees -->
          <v-list-item>
            <template v-slot:prepend>
              <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                <v-icon size="small" color="grey" class="mr-1" v-tooltip="'Base Fee refers to the network Base Fee at the time of the block. Max Fee & Max Priority Fee refer to the max amount a user is willing to pay for their tx & to give to the block producer respectively.'">mdi-help-circle-outline</v-icon>
                Gas Fees:
              </div>
            </template>
            <v-list-item-title class="text-body-2">
              Base: <span class="font-weight-bold">{{ transaction.baseFeePerGas ? $fromWei(transaction.baseFeePerGas, 'gwei', '') : transaction.receipt?.baseFeePerGas ? $fromWei(transaction.receipt.baseFeePerGas, 'gwei', '') : '0 gwei' }}</span> | 
              Max: <span class="font-weight-bold">{{ transaction.maxFeePerGas ? $fromWei(transaction.maxFeePerGas, 'gwei', '') : $fromWei(getGasPriceFromTx(transaction), 'gwei', '') }}</span> | 
              Max Priority: <span class="font-weight-bold">{{ transaction.maxPriorityFeePerGas ? $fromWei(transaction.maxPriorityFeePerGas, 'gwei', '') : '0 gwei' }}</span>
            </v-list-item-title>
          </v-list-item>

          <v-divider class="mx-4"></v-divider>

          <!-- Burnt & Txn Savings Fees -->
          <v-list-item v-if="transaction.receipt">
            <template v-slot:prepend>
              <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                <v-icon size="small" color="grey" class="mr-1" v-tooltip="'Burnt fees are the amount of ETH burned (Base Fee × Gas Used) as part of EIP-1559. Txn Savings are the total fees saved from the amount the user was willing to pay.'">mdi-help-circle-outline</v-icon>
                Burnt & Txn Savings Fees:
              </div>
            </template>
            <v-list-item-title class="text-body-2">
              <v-chip prepend-icon="mdi-fire" size="small" color="error" text-color="white" class="font-weight-medium mr-2" density="comfortable">
                Burnt: {{ calculateBurntFees() }}
              </v-chip>
              <v-chip prepend-icon="mdi-cash" size="small" color="success" text-color="white" class="font-weight-medium mr-2" density="comfortable">
                Txn Savings: {{ calculateTxnSavings() }}
              </v-chip>
            </v-list-item-title>
          </v-list-item>

          <!-- Other Attributes -->
          <v-list-item>
            <template v-slot:prepend>
              <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                <v-icon size="small" color="grey" class="mr-1" v-tooltip="'Additional transaction attributes including transaction type, nonce, and position in block.'">mdi-help-circle-outline</v-icon>
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

    <!-- Function Call Card -->
    <v-card class="mb-6" variant="outlined" v-if="(transaction.to && transaction.data && transaction.data !== '0x') || (transaction.receipt && transaction.receipt.contractAddress)">
      <v-card-item>
        <v-card-title class="text-subtitle-1 font-weight-bold">{{ transaction.to ? 'Called Function' : 'Contract Creation Data' }}</v-card-title>
      </v-card-item>
      <v-card-text>
        <!-- Called Function -->
        <template v-if="transaction.to">
          <div class="transaction-function-call">
            <Transaction-Function-Call :data="transaction.data" :value="transaction.value" :abi="transaction.contract && transaction.contract.abi" :to="transaction.to" />
          </div>
        </template>
        <template v-else-if="transaction.receipt && transaction.receipt.contractAddress">
          <div class="contract-creation">
            <v-card variant="outlined" class="pa-2">
              <v-card-text class="pa-2">
                <Expandable-Text :text="transaction.data" />
              </v-card-text>
            </v-card>
          </div>
        </template>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { ref, computed, inject, onErrorCaptured } from 'vue';
import * as ethers from 'ethers';
import { storeToRefs } from 'pinia';
import { useExplorerStore } from '../stores/explorer';
import { useCurrentWorkspaceStore } from '../stores/currentWorkspace';
import { getGasPriceFromTransaction } from '../lib/utils';
import HashLink from './HashLink.vue';
import TokensBalanceDiff from './TokensBalanceDiff.vue';
import CustomField from './CustomField.vue';
import CompactTransactionTokenTransfers from './CompactTransactionTokenTransfers.vue';
import TransactionFunctionCall from './TransactionFunctionCall.vue';
import ExpandableText from './ExpandableText.vue';

const props = defineProps({
  transaction: {
    type: Object,
    required: true
  }
});

// Define emits
const emit = defineEmits(['error']);

// Inject all required globals
const $fromWei = inject('$fromWei');
const $dt = inject('$dt');

// Stores
const explorerStore = useExplorerStore();
const currentWorkspaceStore = useCurrentWorkspaceStore();

// Reactive state
const showAllBalanceChanges = ref(false);

// Cache frequently accessed values
const cachedGasPrices = new Map();

// Error handling
onErrorCaptured((error) => {
  emit('error', error);
  return false; // prevent error propagation
});

// Computed with memoization
const txStatus = computed(() => {
  if (!props.transaction || !props.transaction.receipt) return 'unknown';

  const receipt = props.transaction.receipt;
  if (receipt && receipt.status !== null && receipt.status !== undefined) {
    return receipt.status ? 'succeeded' : 'failed';
  }

  if (receipt && receipt.root && receipt.root != '0x' && 
      receipt.cumulativeGasUsed !== undefined && receipt.gasUsed !== undefined &&
      parseInt(receipt.cumulativeGasUsed) >= parseInt(receipt.gasUsed)) {
    return 'succeeded';
  }

  return 'unknown';
});

// Make utilities available to template with optimization
const commify = ethers.utils.commify;

// Optimize getGasPriceFromTransaction with caching
const getGasPriceFromTx = (tx) => {
  if (!tx) return '0';
  
  const txId = tx.hash;
  if (!cachedGasPrices.has(txId)) {
    cachedGasPrices.set(txId, getGasPriceFromTransaction(tx));
  }
  return cachedGasPrices.get(txId);
};

// Additional methods with optimization
const calculateBurntFees = () => {
  if (!props.transaction.receipt || !props.transaction.receipt.gasUsed) return '0';
  
  const baseFeePerGas = props.transaction.block.baseFeePerGas || 0;
  const gasUsed = props.transaction.receipt.gasUsed;
  const burntFees = baseFeePerGas * gasUsed;

  return $fromWei(burntFees, 'ether', currentWorkspaceStore.chain.token);
};

const calculateTxnSavings = () => {
  if (!props.transaction.receipt || !props.transaction.receipt.gasUsed) return '0';
  
  const gasUsed = props.transaction.receipt.gasUsed;
  const maxFeePerGas = props.transaction.raw.maxFeePerGas;
  const actualGasPrice = getGasPriceFromTx(props.transaction);
  
  const maxPossibleFee = maxFeePerGas * gasUsed;
  const actualFee = actualGasPrice * gasUsed;
  const txnSavings = maxPossibleFee - actualFee;
  
  return $fromWei(txnSavings > 0 ? txnSavings : 0, 'ether', currentWorkspaceStore.chain.token);
};

// Memoized transaction type name mapping
const txTypeNames = {
  0: 'Legacy',
  1: 'EIP-2930',
  2: 'EIP-1559'
};

const getTxnTypeName = (type) => txTypeNames[type] || 'Unknown';
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

/* Custom divider styling */
.custom-divider {
  height: 1px;
  background-color: rgba(var(--v-theme-on-surface), 0.08);
  margin: 8px 16px;
}

.v-theme--dark .custom-divider {
  background-color: rgba(255, 255, 255, 0.12);
}

/* Enhanced styling for cards */
:deep(.v-card) {
  background-color: white !important;
}

.v-theme--dark :deep(.v-card) {
  background-color: rgb(30, 30, 30) !important;
}

/* Function call styling */
:deep(.transaction-function-call .v-card) {
  box-shadow: none !important;
  border: none !important;
  background-color: transparent !important;
}

:deep(.transaction-function-call .v-card-text) {
  padding: 8px 0 !important;
}

/* Contract creation data styling */
:deep(.contract-creation .v-textarea) {
  margin: 0 !important;
}

/* Integrated Token Transfers & Balance Changes */
.integrated-balance-changes {
  padding-left: 0;
  width: 100%;
}

.integrated-balance-changes :deep(.embedded-balance-diff) {
  border: none !important;
  background: transparent !important;
  padding: 0 !important;
  margin: 0 !important;
}

.integrated-balance-changes :deep(.token-name-container) {
  padding-bottom: 2px;
  padding-left: 0;
  margin-bottom: 4px;
}

:deep(.embedded-transfers) {
  border: none !important;
  background: transparent !important;
  padding: 0 !important;
  margin: 0 !important;
}

:deep(.token-transfers-header) {
  display: none;
}

.token-activity-container {
  padding-top: 4px;
  padding-left: 0;
}

.token-transfers-item, .balance-changes-item {
  padding-top: 12px;
  padding-bottom: 12px;
  position: relative;
}

/* Remove hover effects */
.token-transfers-item:hover, .balance-changes-item:hover {
  background-color: transparent !important;
}

:deep(.embedded-transfer-item:hover), :deep(.embedded-balance-item:hover) {
  background-color: transparent !important;
}

.token-transfers-wrapper {
  width: 100%;
}

/* Remove dividers between token transfers */
:deep(.embedded-transfer-item) {
  border-bottom: none !important;
}
</style>
