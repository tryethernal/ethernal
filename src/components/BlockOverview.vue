<template>
    <div>
        <v-card>
            <v-card-text class="pa-0">
                <v-list density="compact" class="block-list">
                    <v-list-item class="d-flex flex-column flex-sm-row">
                        <template v-slot:prepend>
                            <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 180px;">
                                <v-icon size="small" color="grey" class="mr-1" v-tooltip="'The block number in the blockchain'">mdi-help-circle-outline</v-icon>
                                Block Height:
                            </div>
                        </template>
                        <v-list-item-title class="text-body-2">
                            {{ block.number && commify(block.number) }}
                        </v-list-item-title>
                    </v-list-item>

                    <v-list-item class="d-flex flex-column flex-sm-row">
                        <template v-slot:prepend>
                            <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 180px;">
                                <v-icon size="small" color="grey" class="mr-1" v-tooltip="'The date and time at which this block was mined'">mdi-help-circle-outline</v-icon>
                                Timestamp:
                            </div>
                        </template>
                        <v-list-item-title class="text-body-2" style="word-break: break-word;">
                            <template v-if="block.timestamp">
                                {{ `${$dt.shortDate(block.timestamp)}` }}<span class="text-medium-emphasis"> ({{ $dt.fromNow(block.timestamp) }})</span>
                            </template>
                            <template v-else>
                                -
                            </template>
                        </v-list-item-title>
                    </v-list-item>

                    <v-list-item class="d-flex flex-column flex-sm-row">
                        <template v-slot:prepend>
                            <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 180px;">
                                <v-icon size="small" color="grey" class="mr-1" v-tooltip="'Number of transactions included in this block'">mdi-help-circle-outline</v-icon>
                                Transactions:
                            </div>
                        </template>
                        <v-list-item-title class="text-body-2">
                            <a href="#" @click.prevent="$emit('change-tab', 'transactions')" class="text-decoration-none">{{ block.transactionsCount || 0 }} transactions</a>
                        </v-list-item-title>
                    </v-list-item>

                    <v-divider class="mx-4"></v-divider>
                    <v-list-item class="d-flex flex-column flex-sm-row">
                        <template v-slot:prepend>
                            <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 180px;">
                                <v-icon size="small" color="grey" class="mr-1" v-tooltip="'The address of the miner who validated this block'">mdi-help-circle-outline</v-icon>
                                Validated By:
                            </div>
                        </template>
                        <v-list-item-title class="text-body-2">
                            <Hash-Link v-if="block.miner" :type="'address'" :hash="block.miner" :fullHash="true" :withName="true" />
                            <span v-else>-</span>
                        </v-list-item-title>
                    </v-list-item>

                    <v-list-item class="d-flex flex-column flex-sm-row">
                        <template v-slot:prepend>
                            <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 180px;">
                                <v-icon size="small" color="grey" class="mr-1" v-tooltip="'The amount of effort required to validate a new block'">mdi-help-circle-outline</v-icon>
                                Difficulty:
                            </div>
                        </template>
                        <v-list-item-title class="text-body-2">
                            {{ block.difficulty ? block.difficulty.toLocaleString() : '-' }}
                        </v-list-item-title>
                    </v-list-item>

                    <v-list-item class="d-flex flex-column flex-sm-row">
                        <template v-slot:prepend>
                            <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 180px;">
                                <v-icon size="small" color="grey" class="mr-1" v-tooltip="'Total difficulty of this chain until this block'">mdi-help-circle-outline</v-icon>
                                Total Difficulty:
                            </div>
                        </template>
                        <v-list-item-title class="text-body-2">
                            {{ block.raw && block.raw.totalDifficulty ? block.raw.totalDifficulty.toLocaleString() : '-' }}
                        </v-list-item-title>
                    </v-list-item>

                    <v-list-item class="d-flex flex-column flex-sm-row">
                        <template v-slot:prepend>
                            <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 180px;">
                                <v-icon size="small" color="grey" class="mr-1" v-tooltip="'The size of the block data in bytes'">mdi-help-circle-outline</v-icon>
                                Size:
                            </div>
                        </template>
                        <v-list-item-title class="text-body-2">
                            {{ block.raw && block.raw.size ? `${parseInt(block.raw.size).toLocaleString()} bytes` : '-' }}
                        </v-list-item-title>
                    </v-list-item>

                    <v-divider class="mx-4"></v-divider>

                    <v-list-item class="d-flex flex-column flex-sm-row">
                        <template v-slot:prepend>
                            <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 180px;">
                                <v-icon size="small" color="grey" class="mr-1" v-tooltip="'The amount of gas used by all transactions in this block'">mdi-help-circle-outline</v-icon>
                                Gas Used:
                            </div>
                        </template>
                        <v-list-item-title class="text-body-2">
                            {{ block.gasUsed ? parseInt(block.gasUsed).toLocaleString() : '-' }}
                            <span v-if="block.gasUsed && block.gasLimit" class="text-medium-emphasis">
                                ({{ calculateGasPercentage(block.gasUsed, block.gasLimit) }}%)
                            </span>
                        </v-list-item-title>
                    </v-list-item>

                    <v-list-item class="d-flex flex-column flex-sm-row">
                        <template v-slot:prepend>
                            <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 180px;">
                                <v-icon size="small" color="grey" class="mr-1" v-tooltip="'The maximum amount of gas allowed in this block'">mdi-help-circle-outline</v-icon>
                                Gas Limit:
                            </div>
                        </template>
                        <v-list-item-title class="text-body-2">
                            {{ block.gasLimit ? parseInt(block.gasLimit).toLocaleString() : '-' }}
                        </v-list-item-title>
                    </v-list-item>

                    <v-list-item class="d-flex flex-column flex-sm-row">
                        <template v-slot:prepend>
                            <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 180px;">
                                <v-icon size="small" color="grey" class="mr-1" v-tooltip="'The minimum price per unit of gas that transactions must pay to be included in this block'">mdi-help-circle-outline</v-icon>
                                Base Fee Per Gas:
                            </div>
                        </template>
                        <v-list-item-title class="text-body-2" style="word-break: break-word;">
                            {{ block.baseFeePerGas ? $fromWei(block.baseFeePerGas, 'ether', currentWorkspaceStore.chain.token) : '-' }}
                            <span v-if="block.baseFeePerGas" class="text-medium-emphasis">
                                ({{ block.baseFeePerGas.toLocaleString() }} gwei)
                            </span>
                        </v-list-item-title>
                    </v-list-item>

                    <v-list-item class="d-flex flex-column flex-sm-row">
                        <template v-slot:prepend>
                            <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 180px;">
                                <v-icon size="small" color="grey" class="mr-1" v-tooltip="'This represent the part of the tx fee that is burnt (baseFeePerGas * gasUsed)'">mdi-help-circle-outline</v-icon>
                                Burnt Fees:
                            </div>
                        </template>
                        <v-list-item-title class="text-body-2">
                            <v-chip prepend-icon="mdi-fire" size="small" color="error" text-color="white" class="font-weight-medium mr-2" density="comfortable">
                                {{ calculateBurntFees() }}
                            </v-chip>
                        </v-list-item-title>
                    </v-list-item>

                    <v-list-item class="d-flex flex-column flex-sm-row">
                        <template v-slot:prepend>
                            <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 180px;">
                                <v-icon size="small" color="grey" class="mr-1" v-tooltip="'Extra data included in the block'">mdi-help-circle-outline</v-icon>
                                Extra Data:
                            </div>
                        </template>
                        <v-list-item-title class="text-body-2">
                            <div v-if="block.extraData && block.extraData.length > 2" class="d-flex flex-sm-row flex-column ga-1 extra-data-container" style="column-gap: 16px;">
                                <v-card variant="outlined" class="pa-2 extra-data-card">
                                    <span class="font-weight-medium">UTF-8: </span>
                                    <ExpandableText :text="tryDecodeExtraData(block.extraData)" :maxChars="100" />
                                </v-card>
                                <v-card variant="outlined" class="pa-2 extra-data-card">
                                    <span class="font-weight-medium">Hex: </span>
                                    <ExpandableText :text="block.extraData" :maxChars="100" />
                                </v-card>
                            </div>
                            <span v-else>-</span>
                        </v-list-item-title>
                    </v-list-item>

                    <template v-if="explorerStore.l1Explorer && block.l1BlockNumber">
                        <v-list-item>
                            <template v-slot:prepend>
                                <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 180px;">
                                    <v-icon size="small" color="grey" class="mr-1" v-tooltip="'The corresponding L1 block for this L2 block'">mdi-help-circle-outline</v-icon>
                                    L1 Block:
                                </div>
                            </template>
                            <v-list-item-title class="text-body-2">
                                <a style="text-decoration: none;" :href="`${explorerStore.l1Explorer}/block/${block.l1BlockNumber}`" target="_blank">{{ commify(block.l1BlockNumber) }}</a>
                            </v-list-item-title>
                        </v-list-item>
                    </template>
                </v-list>
            </v-card-text>
        </v-card>

        <!-- More Details Card -->
        <v-card class="my-6">
            <v-card-title class="text-subtitle-1 font-weight-bold">More Details</v-card-title>
            <v-card-text class="pa-0">
                <v-list density="compact" class="block-list">
                    <!-- Hash -->
                    <v-list-item class="d-flex flex-column flex-sm-row">
                        <template v-slot:prepend>
                            <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 180px;">
                                <v-icon size="small" color="grey" class="mr-1" v-tooltip="'The unique identifier hash for this block'">mdi-help-circle-outline</v-icon>
                                Hash:
                            </div>
                        </template>
                        <v-list-item-title class="text-body-2 text-truncate" style="overflow-wrap: break-word;">
                            {{ block.hash || '-' }}
                        </v-list-item-title>
                    </v-list-item>

                    <!-- Parent Hash -->
                    <v-list-item v-if="block.parentHash" class="d-flex flex-column flex-sm-row">
                        <template v-slot:prepend>
                            <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 180px;">
                                <v-icon size="small" color="grey" class="mr-1" v-tooltip="'The hash of the parent block'">mdi-help-circle-outline</v-icon>
                                Parent Hash:
                            </div>
                        </template>
                        <v-list-item-title class="text-body-2 text-truncate" style="overflow-wrap: break-word;">
                            <router-link v-if="block.number > 0" style="text-decoration: none;" :to="'/block/' + (block.number - 1)">{{ block.parentHash }}</router-link>
                            <span v-else>{{ block.parentHash || '-' }}</span>
                        </v-list-item-title>
                    </v-list-item>

                    <!-- Sha3Uncles -->
                    <v-list-item v-if="block.raw && block.raw.sha3Uncles" class="d-flex flex-column flex-sm-row">
                        <template v-slot:prepend>
                            <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 180px;">
                                <v-icon size="small" color="grey" class="mr-1" v-tooltip="'The SHA3 hash of the uncle blocks in this block'">mdi-help-circle-outline</v-icon>
                                Sha3 Uncles:
                            </div>
                        </template>
                        <v-list-item-title class="text-body-2 text-truncate" style="overflow-wrap: break-word;">
                            {{ block.raw.sha3Uncles }}
                        </v-list-item-title>
                    </v-list-item>

                    <!-- State Root -->
                    <v-list-item v-if="block.raw && block.raw.stateRoot" class="d-flex flex-column flex-sm-row">
                        <template v-slot:prepend>
                            <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 180px;">
                                <v-icon size="small" color="grey" class="mr-1" v-tooltip="'The root of the state trie after this block'">mdi-help-circle-outline</v-icon>
                                State Root:
                            </div>
                        </template>
                        <v-list-item-title class="text-body-2 text-truncate" style="overflow-wrap: break-word;">
                            {{ block.raw.stateRoot }}
                        </v-list-item-title>
                    </v-list-item>

                    <!-- Withdrawal Root -->
                    <v-list-item v-if="block.raw && block.raw.withdrawalsRoot" class="d-flex flex-column flex-sm-row">
                        <template v-slot:prepend>
                            <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 180px;">
                                <v-icon size="small" color="grey" class="mr-1" v-tooltip="'The root hash of the withdrawal tree for this block'">mdi-help-circle-outline</v-icon>
                                Withdrawal Root:
                            </div>
                        </template>
                        <v-list-item-title class="text-body-2 text-truncate" style="overflow-wrap: break-word;">
                            {{ block.raw.withdrawalsRoot }}
                        </v-list-item-title>
                    </v-list-item>
                </v-list>
            </v-card-text>
        </v-card>
    </div>
</template>

<script setup>
import { inject } from 'vue';
import { useExplorerStore } from '../stores/explorer';
import { useCurrentWorkspaceStore } from '../stores/currentWorkspace';
import { utils } from 'ethers';
import HashLink from './HashLink.vue';
import ExpandableText from './ExpandableText.vue';

// Get Vue instance to access global properties
const $dt = inject('$dt');
const $fromWei = inject('$fromWei');

// Props
const props = defineProps({
    block: {
        type: Object,
        required: true
    }
});

// Emits
const emit = defineEmits(['change-tab']);

// Stores
const explorerStore = useExplorerStore();
const currentWorkspaceStore = useCurrentWorkspaceStore();
// Methods
const commify = utils.commify;

// Calculate gas used percentage with 2 decimal places
const calculateGasPercentage = (gasUsed, gasLimit) => {
    const percentage = (parseInt(gasUsed) / parseInt(gasLimit)) * 100;
    return percentage.toFixed(2).replace('.', ',');
};

// Additional methods with optimization
const calculateBurntFees = () => {
  if (!props.block.baseFeePerGas || !props.block.gasUsed) return '0';
  
  const baseFeePerGas = props.block.baseFeePerGas || 0;
  const gasUsed = props.block.gasUsed;
  const burntFees = baseFeePerGas * gasUsed;

  return $fromWei(burntFees, 'ether', currentWorkspaceStore.chain.token);
};

// Try to decode extraData from hex to ASCII, if not readable then return the original hex
const tryDecodeExtraData = (hexData) => {
    try {
        // Remove '0x' prefix if present
        const hex = hexData.startsWith('0x') ? hexData.slice(2) : hexData;
        
        // Convert hex to bytes
        const bytes = new Uint8Array(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
        
        // Convert bytes to ASCII, filter out non-printable characters
        const decoded = String.fromCharCode.apply(null, bytes)
            .replace(/[^\x20-\x7E]/g, ''); // Keep only printable ASCII chars
            
        // If the decoded string is empty or very short compared to original, return original
        if (!decoded || decoded.length < hex.length / 10) {
            return hexData;
        }
        
        return decoded;
    } catch (error) {
        console.warn('Failed to decode extra data:', error);
        return hexData;
    }
};
</script>

<style scoped>
.block-list :deep(.v-list-item) {
  min-height: 48px;
  padding-top: 8px;
  padding-bottom: 8px;
  border-bottom: none;
}

.block-list :deep(.v-list-item__prepend) {
  align-self: start;
}

.block-list :deep(.v-list-item__content) {
  align-self: start;
}

.block-list :deep(.v-list-item-title) {
  word-break: break-all;
  white-space: inherit !important;
}


.v-theme--dark .block-list :deep(.v-list-item) {
  border-bottom: none;
}

.extra-data-container {
  column-gap: 16px;
}

.extra-data-card {
  flex-grow: 1;
  min-width: 0;
  overflow: hidden;
}

.extra-data-card :deep(.expandable-text) {
  width: 100%;
  overflow: hidden;
}
</style>
