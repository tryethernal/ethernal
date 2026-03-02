<template>
  <div class="overview-tab-content">
    <!-- Transaction Information Card (without header) -->
    <v-card class="mb-6">
      <v-card-text class="pa-0">
        <v-list density="compact" class="transaction-list">
          <!-- Transaction Hash -->
          <v-list-item class="d-flex flex-column flex-sm-row">
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
          <v-list-item class="d-flex flex-column flex-sm-row">
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
                class="font-weight-medium mr-2"
              >
                <v-progress-circular v-if="!transaction.receipt" indeterminate size="16" width="2" color="white" class="mr-2 slow-spin"></v-progress-circular>
                {{ !transaction.receipt ? 'Pending' : txStatus == 'succeeded' ? 'Success' : txStatus == 'failed' ? 'Failed' : 'Unknown' }}
              </v-chip>
              <Method-Details-Chip v-if="transaction.data.length > 2" :transaction="transaction" />
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

          <v-list-item v-if="transaction.block.orbitStatus" class="d-flex flex-column flex-sm-row mb-2">
            <template v-slot:prepend>
              <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                <v-icon size="small" color="grey" class="mr-1" v-tooltip="'Transaction lifecycle status on L1'">mdi-help-circle-outline</v-icon>
                L1 Status:
              </div>
            </template>
            <v-list-item-title class="text-body-2">
              <OrbitBlockStatus :status="transaction.block.orbitStatus" />
            </v-list-item-title>
          </v-list-item>

          <!-- Block -->
          <v-list-item class="d-flex flex-column flex-sm-row">
            <template v-slot:prepend>
              <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                <v-icon size="small" color="grey" class="mr-1" v-tooltip="'The block number in which this transaction was included'">mdi-help-circle-outline</v-icon>
                Block:
              </div>
            </template>
            <v-list-item-title class="text-body-2">
              <router-link v-if="transaction.blockNumber" style="text-decoration: none;" :to="'/block/' + transaction.blockNumber">{{ commify(transaction.blockNumber) }}</router-link>
              <span v-else>-</span>
              <span v-if="blockConfirmations > 0" class="ml-2 confirmation-text">
                <v-chip size="small" :color="theme.global.current.value.dark ? 'grey-lighten-1' : 'grey-darken-2'"class="font-weight-medium mr-2" density="comfortable">
                  {{ commify(blockConfirmations) }} Block Confirmations
                </v-chip>
              </span>
            </v-list-item-title>
          </v-list-item>

          <v-list-item v-if="transaction.block.orbitBatch" class="d-flex flex-column flex-sm-row">
            <template v-slot:prepend>
              <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                <v-icon size="small" color="grey" class="mr-1" v-tooltip="'Index of the batch containing this transaction'">mdi-help-circle-outline</v-icon>
                Batch:
              </div>
            </template>
            <v-list-item-title class="text-body-2">
              <router-link class="text-decoration-none" :to="`/batch/${transaction.block.orbitBatch.batchSequenceNumber}`">{{ Number(transaction.block.orbitBatch.batchSequenceNumber).toLocaleString() }}</router-link>
            </v-list-item-title>
          </v-list-item>

          <!-- Timestamp -->
          <v-list-item class="d-flex flex-column flex-sm-row">
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

          <!-- Divider before ad -->
          <v-divider class="mx-4 mb-2"></v-divider>

          <template v-if="currentWorkspaceStore.displayAds">
            <!-- Ad Banner -->
            <v-list-item>
              <template v-slot:prepend>
                <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                  <v-icon size="small" color="grey" class="mr-1" v-tooltip="'Sponsor banner advertisement'">mdi-help-circle-outline</v-icon>
                  Sponsored:
                </div>
              </template>
              <v-list-item-title>
                <AdBanner />
              </v-list-item-title>
            </v-list-item>

            <!-- Divider after ad -->
            <v-divider class="mx-4 mb-2"></v-divider>
          </template>

          <!-- Token Transfers Section (if any) -->
          <template v-if="transaction.tokenTransferCount && transaction.tokenTransferCount > 0">
            <v-list-item class="token-transfers-item d-flex flex-column flex-sm-row">
              <template v-slot:prepend>
                <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                  <v-icon size="small" color="grey" class="mr-1" v-tooltip="'Tokens transferred in this transaction'">mdi-help-circle-outline</v-icon>
                  Token Transfers ({{ transaction.tokenTransferCount }}):
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
                    :totalTransfers="transaction.tokenTransferCount"
                  />
                </div>
              </v-list-item-title>
            </v-list-item>
            <v-divider class="mx-4 mb-2"></v-divider>
          </template>

          <!-- From -->
          <v-list-item class="d-flex flex-column flex-sm-row">
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
          <v-list-item v-if="transaction.to" class="d-flex flex-column flex-sm-row">
            <template v-slot:prepend>
              <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                <v-icon size="small" color="grey" class="mr-1" v-tooltip="'The receiving address of the transaction'">mdi-help-circle-outline</v-icon>
                <template v-if="Object.keys(transaction.methodDetails).length > 0">Interacted With (To):</template>
                <template v-else>To:</template>
              </div>
            </template>
            <v-list-item-title class="text-body-2 text-truncate">
              <Hash-Link :type="'address'" :hash="transaction.to" :fullHash="true" :withName="true" :withTokenName="false" :contract="transaction.contract" />
            </v-list-item-title>
          </v-list-item>
          <v-list-item v-else class="d-flex flex-column flex-sm-row">
            <template v-slot:prepend>
              <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                <v-icon size="small" color="grey" class="mr-1" v-tooltip="'The address of the contract created by this transaction'">mdi-help-circle-outline</v-icon>
                Contract Created:
              </div>
            </template>
            <v-list-item-title class="text-body-2 text-truncate">
              <Hash-Link v-if="transaction.receipt && transaction.receipt.contractAddress" :type="'address'" :contract="transaction.receipt.createdContract" :hash="transaction.receipt.contractAddress" :fullHash="true" :withName="true" />
              <span v-else>-</span>
            </v-list-item-title>
          </v-list-item>

          <!-- Custom divider -->
          <v-divider class="mx-4"></v-divider>

          <template v-if="transaction.block.orbitBatch && transaction.block.orbitBatch.confirmationStatus == 'confirmed'">
            <v-list-item class="d-flex flex-column flex-sm-row mt-2">
              <template v-slot:prepend>
                <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                  <v-icon size="small" color="grey" class="mr-1" v-tooltip="'L1 transaction containing this batch commitment'">mdi-help-circle-outline</v-icon>
                  Commitment tx
                </div>
              </template>
              <v-list-item-title class="text-body-2">
                <a class="text-decoration-none" :href="`${currentWorkspaceStore.orbitConfig.parentChainExplorer}/tx/${transaction.block.orbitBatch.parentChainTxHash}`" target="_blank">
                  {{ transaction.block.orbitBatch.parentChainTxHash }}
                  <v-icon size="x-small" color="primary" class="pb-1">mdi-open-in-new</v-icon>
                </a>
              </v-list-item-title>
            </v-list-item>

            <v-divider class="mx-4"></v-divider>
          </template>

          <!-- Value -->
          <v-list-item class="d-flex flex-column flex-sm-row mt-2">
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
          <v-list-item v-if="transaction.receipt" class="d-flex flex-column flex-sm-row">
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

          <template v-if="transaction.receipt.gasUsedForL1">
            <v-list-item v-if="transaction.receipt" class="d-flex flex-column flex-sm-row">
              <template v-slot:prepend>
                <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                  <v-icon size="small" color="grey" class="mr-1" v-tooltip="'Fee payable to the L1 network'">mdi-help-circle-outline</v-icon>
                  Poster Fee:
                </div>
              </template>
              <v-list-item-title class="text-body-2">
                {{ getPosterFee() }}
              </v-list-item-title>
            </v-list-item>

            <v-list-item v-if="transaction.receipt" class="d-flex flex-column flex-sm-row">
              <template v-slot:prepend>
                <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                  <v-icon size="small" color="grey" class="mr-1" v-tooltip="'Fee payable to the L2 network'">mdi-help-circle-outline</v-icon>
                  Network Fee:
                </div>
              </template>
              <v-list-item-title class="text-body-2">
                {{ getNetworkFee() }}
              </v-list-item-title>
            </v-list-item>
          </template>

          <!-- Gas Price -->
          <v-list-item v-if="transaction.receipt" class="d-flex flex-column flex-sm-row">
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


          <!-- Fee Recipient -->
          <v-list-item v-if="transaction.miner" class="d-flex flex-column flex-sm-row">
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
          <v-list-item v-for="(field, idx) in transaction.extraFields" :key="idx" class="d-flex flex-column flex-sm-row">
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
          <v-list-item class="d-flex flex-column flex-sm-row">
            <template v-slot:prepend>
              <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                <v-icon size="small" color="grey" class="mr-1" v-tooltip="'Gas limit provided by the sender and amount of gas used by the transaction.'">mdi-help-circle-outline</v-icon>
                Gas Limit & Usage by Txn:
              </div>
            </template>
            <v-list-item-title class="text-body-2">
              <span v-if="transaction.gasLimit" class="d-flex flex-column flex-sm-row align-center ga-1">
                {{ parseInt(transaction.gasLimit).toLocaleString() }}
                <v-divider vertical class="mx-2"></v-divider>
                <template v-if="transaction.receipt">
                  {{ parseInt(transaction.receipt.gasUsed).toLocaleString() }}
                  <v-divider vertical class="mx-2"></v-divider>
                  <v-progress-linear height="5" style="width: 75px;" :model-value="percentageGasUsed" color="success" />
                  <span class="font-weight-medium text-success">{{ percentageLabel(percentageGasUsed) }}</span>
                </template>
                <template v-else>
                  <span class="font-italic">(Pending)</span>
                </template>
              </span>
              <span v-else>-</span>
            </v-list-item-title>
          </v-list-item>

          <template v-if="transaction.receipt.gasUsedForL1 !== undefined">
            <v-list-item class="d-flex flex-column flex-sm-row">
              <template v-slot:prepend>
                <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                  <v-icon size="small" color="grey" class="mr-1" v-tooltip="'L2 gas set aside for L1 data changes'">mdi-help-circle-outline</v-icon>
                  Gas Used For L1:
                </div>
              </template>
              <v-list-item-title class="text-body-2 d-flex flex-column flex-sm-row align-center ga-3">
                {{ $fromWei(transaction.receipt.gasUsedForL1, 'wei', ' ') }}
                <v-divider vertical></v-divider>
                <v-progress-linear height="5" style="width: 75px;" :model-value="percentageL1Gas" color="success" />
                <span class="font-weight-medium text-success">{{ percentageLabel(percentageL1Gas) }}</span>
              </v-list-item-title>
            </v-list-item>

            <v-list-item class="d-flex flex-column flex-sm-row">
              <template v-slot:prepend>
                <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                  <v-icon size="small" color="grey" class="mr-1" v-tooltip="'L2 gas spent on L2 resources'">mdi-help-circle-outline</v-icon>
                  Gas Used For L2:
                </div>
              </template>
              <v-list-item-title class="text-body-2 d-flex flex-column flex-sm-row align-center ga-3">
                {{ $fromWei(ethers.BigNumber.from(transaction.receipt.gasUsed).sub(transaction.receipt.gasUsedForL1), 'wei', ' ') }}
                <v-divider vertical></v-divider>
                <v-progress-linear height="5" style="width: 75px;" :model-value="percentageL2Gas" color="success" />
                <span class="font-weight-medium text-success">{{ percentageLabel(percentageL2Gas) }}</span>
              </v-list-item-title>
            </v-list-item>
          </template>

          <!-- Gas Fees -->
          <v-list-item class="d-flex flex-column flex-sm-row">
            <template v-slot:prepend>
              <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                <v-icon size="small" color="grey" class="mr-1" v-tooltip="'Base Fee refers to the network Base Fee at the time of the block. Max Fee & Max Priority Fee refer to the max amount a user is willing to pay for their tx & to give to the block producer respectively.'">mdi-help-circle-outline</v-icon>
                Gas Fees:
              </div>
            </template>
            <v-list-item-title class="text-body-2 d-flex flex-column flex-sm-row ga-1" style="word-break: break-word;">
              Base: <span class="font-weight-bold">{{ transaction.baseFeePerGas ? $fromWei(transaction.baseFeePerGas, 'gwei', '') : transaction.receipt?.baseFeePerGas ? $fromWei(transaction.receipt.baseFeePerGas, 'gwei', '') : '0 gwei' }}</span>
              <v-divider vertical class="mx-2"></v-divider>
              Max: <span class="font-weight-bold">{{ transaction.maxFeePerGas ? $fromWei(transaction.maxFeePerGas, 'gwei', '') : $fromWei(getGasPriceFromTx(transaction), 'gwei', '') }}</span>
              <v-divider vertical class="mx-2"></v-divider>
              Max Priority: <span class="font-weight-bold">{{ transaction.maxPriorityFeePerGas ? $fromWei(transaction.maxPriorityFeePerGas, 'gwei', '') : '0 gwei' }}</span>
            </v-list-item-title>
          </v-list-item>

          <v-divider class="mx-4"></v-divider>

          <!-- Burnt & Txn Savings Fees -->
          <v-list-item v-if="transaction.receipt" class="d-flex flex-column flex-sm-row mt-2">
            <template v-slot:prepend>
              <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                <v-icon size="small" color="grey" class="mr-1" v-tooltip="'Burnt fees are the amount of ETH burned (Base Fee × Gas Used) as part of EIP-1559. Txn Savings are the total fees saved from the amount the user was willing to pay.'">mdi-help-circle-outline</v-icon>
                Burnt & Txn Savings Fees:
              </div>
            </template>
            <v-list-item-title class="text-body-2 d-flex flex-column flex-sm-row ga-1">
              <v-chip prepend-icon="mdi-fire" size="small" color="error" text-color="white" class="font-weight-medium mr-2" density="comfortable">
                Burnt: {{ calculateBurntFees() }}
              </v-chip>
              <v-chip prepend-icon="mdi-cash" size="small" color="success" text-color="white" class="font-weight-medium mr-2" density="comfortable">
                Txn Savings: {{ calculateTxnSavings() }}
              </v-chip>
            </v-list-item-title>
          </v-list-item>

          <!-- Other Attributes -->
          <v-list-item class="d-flex flex-column flex-sm-row">
            <template v-slot:prepend>
              <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                <v-icon size="small" color="grey" class="mr-1" v-tooltip="'Additional transaction attributes including transaction type, nonce, and position in block.'">mdi-help-circle-outline</v-icon>
                Other Attributes:
              </div>
            </template>
            <v-list-item-title class="text-body-2 d-flex flex-column flex-sm-row ga-1">
              <v-chip
                size="small"
                :color="theme.global.current.value.dark ? 'grey-lighten-1' : 'grey-darken-2'"
                text-color="white"
                class="font-weight-medium mr-2"
                density="comfortable"
              >
                Txn Type: {{ transaction.type || '0' }} ({{ getTxnTypeName(transaction.type) }})
              </v-chip>
              <v-chip
                size="small"
                :color="theme.global.current.value.dark ? 'grey-lighten-1' : 'grey-darken-2'"
                text-color="white"
                class="font-weight-medium mr-2"
                density="comfortable"
              >
                Nonce: {{ transaction.nonce !== undefined ? transaction.nonce : '-' }}
              </v-chip>
              <v-chip
                size="small"
                :color="theme.global.current.value.dark ? 'grey-lighten-1' : 'grey-darken-2'"
                text-color="white"
                class="font-weight-medium"
                density="comfortable"
              >
                Position In Block: {{ transaction.transactionIndex !== undefined ? transaction.transactionIndex : '-' }}
              </v-chip>
              <v-chip v-if="transaction.receipt.timeboosted"
                size="small"
                :color="theme.global.current.value.dark ? 'grey-lighten-1' : 'grey-darken-2'"
                text-color="white"
                class="font-weight-medium"
                density="comfortable"
              >
                Timeboosted: {{ transaction.receipt.timeboosted ? 'True' : 'False' }}
              </v-chip>
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>

    <!-- Function Call Card -->
    <v-card class="mb-6" v-if="(transaction.to && transaction.data && transaction.data !== '0x') || (transaction.receipt && transaction.receipt.contractAddress)">
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
import { computed, inject, onErrorCaptured, onMounted, onUnmounted } from 'vue';
import * as ethers from 'ethers';
import { useExplorerStore } from '../stores/explorer';
import { useCurrentWorkspaceStore } from '../stores/currentWorkspace';
import { getGasPriceFromTransaction } from '../lib/utils';
import { useTheme } from 'vuetify';
import HashLink from './HashLink.vue';
import CustomField from './CustomField.vue';
import CompactTransactionTokenTransfers from './CompactTransactionTokenTransfers.vue';
import TransactionFunctionCall from './TransactionFunctionCall.vue';
import ExpandableText from './ExpandableText.vue';
import AdBanner from './AdBanner.vue';
import MethodDetailsChip from './MethodDetailsChip.vue';
import OrbitBlockStatus from './OrbitBlockStatus.vue';

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
const $pusher = inject('$pusher');

// Stores
const explorerStore = useExplorerStore();
const currentWorkspaceStore = useCurrentWorkspaceStore();
const theme = useTheme();

// Keep current block updated via Pusher
const onBlock = block => {
    if (block.number > (currentWorkspaceStore.currentBlock?.number || 0))
        currentWorkspaceStore.updateCurrentBlock(block);
};
let pusherChannel = null;

onMounted(() => {
    pusherChannel = $pusher.onNewBlock(onBlock);
});

onUnmounted(() => {
    if (pusherChannel)
        pusherChannel.unbind('new', onBlock);
});

// Block confirmations - reactive and never negative
const blockConfirmations = computed(() => {
  if (!currentWorkspaceStore.currentBlock || !currentWorkspaceStore.currentBlock.number || !props.transaction.blockNumber)
    return 0;
  return Math.max(0, currentWorkspaceStore.currentBlock.number - props.transaction.blockNumber);
});

// Cache frequently accessed values
const cachedGasPrices = new Map();

const percentageGasUsed = computed(() => {
  if (!props.transaction.receipt || !props.transaction.receipt.gasUsed || !props.transaction.gasLimit) return '0';
  const number = Number(ethers.BigNumber.from(props.transaction.receipt.gasUsed).mul(100000).div(props.transaction.gasLimit).toNumber() / 1000);
  return number / 1000 < 0.01 ? 0.00999 : (number / 1000).toFixed(2);
});

const percentageLabel = (value) => {
  if (value == 0) return '0%';
  else if (value < 0.01) return '<0.01%';
  else return `${value}%`;
}

  const percentageL1Gas = computed(() => {
  if (!props.transaction.receipt || !props.transaction.receipt.gasUsed || !props.transaction.receipt.gasUsedForL1) return '0';
  const number = Number(ethers.BigNumber.from(props.transaction.receipt.gasUsedForL1).mul(100000).div(props.transaction.receipt.gasUsed));
  return props.transaction.receipt.gasUsedForL1 > 0 && number / 1000 < 0.01 ? 0.00999 : (number / 1000).toFixed(2);
});

const percentageL2Gas = computed(() => {
  if (!props.transaction.receipt || !props.transaction.receipt.gasUsed || !props.transaction.receipt.gasUsedForL1) return '0';
  const number = Number(ethers.BigNumber.from(props.transaction.receipt.gasUsed).sub(props.transaction.receipt.gasUsedForL1).mul(100000).div(props.transaction.receipt.gasUsed));
  return number / 1000 < 0.01 ? 0.00999 : (number / 1000).toFixed(2);
});

const getPosterFee = () => {
  return $fromWei(ethers.BigNumber.from(props.transaction.receipt.gasUsedForL1).mul(getGasPriceFromTx(props.transaction)), 'ether', currentWorkspaceStore.chain.token);
}

const getNetworkFee = () => {
  return $fromWei(ethers.BigNumber.from(props.transaction.receipt.gasUsed).sub(props.transaction.receipt.gasUsedForL1).mul(getGasPriceFromTx(props.transaction)), 'ether', currentWorkspaceStore.chain.token);
}

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
  border-bottom: none;
}

.transaction-list :deep(.v-list-item__prepend) {
  align-self: start;
}

.transaction-list :deep(.v-list-item__content) {
  align-self: start;
}

.transaction-list :deep(.v-list-item-title) {
  word-break: break-all;
  white-space: inherit !important;
  color: rgb(var(--v-theme-on-surface));
}

.transaction-list :deep(.text-subtitle-2) {
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.transaction-function-call :deep(.v-card) {
  background-color: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
}

.transaction-function-call :deep(.v-card-title) {
  color: rgb(var(--v-theme-on-surface));
}

.contract-creation :deep(.v-card) {
  background-color: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
}
</style>
