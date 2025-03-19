<template>
    <v-container fluid>
        <h2 class="text-h6 font-weight-medium">
            Address <span class="text-body-1 text-medium-emphasis">{{ address }}</span>
        </h2>
        <v-divider class="my-4"></v-divider>
        <v-card v-if="loadingContract" border>
            <v-card-text>
                <v-row>
                    <v-col cols="4">
                        <v-skeleton-loader type="card"></v-skeleton-loader>
                    </v-col>
                </v-row>
                <v-row>
                    <v-col>
                        <v-skeleton-loader max-height="40vh" type="table"></v-skeleton-loader>
                    </v-col>
                </v-row>
            </v-card-text>
        </v-card>
        <template v-else>
            <v-row class="mb-1">
                <v-col cols="12" sm="6" lg="3">
                    <v-card :loading="loadingBalance">
                        <v-card-text>
                            <h3 class="mb-3 font-weight-medium">Overview</h3>

                            <h4 class="text-uppercase text-caption text-medium-emphasis">{{ currentWorkspaceStore.chain.token }} Balance</h4>
                            {{ fromWei(balance, 'ether', currentWorkspaceStore.chain.token) }}
                        </v-card-text>
                    </v-card>
                </v-col>
                <v-col cols="12" sm="6" lg="3">
                    <v-card :loading="loadingStats">
                        <v-card-text>
                            <h3 class="mb-3 font-weight-medium">More Info</h3>

                            <h4 class="text-uppercase text-caption text-medium-emphasis">Transactions Sent</h4>
                            Latest:
                            <span class="font-weight-medium mr-3">
                                <router-link v-if="addressTransactionStats.last_transaction_hash" class="no-decoration" :to="`/transaction/${addressTransactionStats.last_transaction_hash}`">
                                    {{ dt.fromNow(addressTransactionStats.last_transaction_timestamp) }}
                                    <sup><v-icon size="small" icon="mdi-arrow-top-right"></v-icon></sup>
                                </router-link>
                                <span v-else>N/A</span>
                            </span>
                            First:
                            <span class="font-weight-medium">
                                <router-link v-if="addressTransactionStats.first_transaction_hash" class="no-decoration" :to="`/transaction/${addressTransactionStats.first_transaction_hash}`">
                                    {{ dt.fromNow(addressTransactionStats.first_transaction_timestamp) }}
                                    <sup><v-icon size="small" icon="mdi-arrow-top-right"></v-icon></sup>
                                </router-link>
                                <span v-else>N/A</span>
                            </span>
                        </v-card-text>
                    </v-card>
                </v-col>
                <v-col cols="12" sm="6" lg="3" v-if="contract">
                    <v-card style="height: 100%">
                        <v-card-title v-if="contract.name">{{ contract.name }}</v-card-title>
                        <v-card-subtitle v-if="contract.patterns.length > 0" class="mt-2">
                            <v-chip v-for="(pattern, idx) in contract.patterns" :key="idx" size="x-small" class="bg-success mr-2">
                                {{ formatContractPattern(pattern) }}
                            </v-chip>
                        </v-card-subtitle>
                        <v-card-text>
                            <v-row>
                                <v-col v-if="isErc20 || isErc721" cols="6">
                                    <small>Token Name</small><br>
                                    <span class="ml-2">
                                        <Hash-Link :type="'token'" :contract="contract" :hash="contract.address" :withName="true" :withTokenName="true" />
                                    </span>
                                </v-col>

                                <v-col v-if="isErc20 || isErc721" cols="6">
                                    <small>Token Symbol</small><br>
                                    <span class="text-h6 ml-2">{{ contract.tokenSymbol || 'N/A' }}</span>
                                </v-col>

                                <v-col cols="6">
                                    <small>Deployment Transaction</small><br>
                                    <span v-if="contract.creationTransaction" class="ml-2">
                                        <Hash-Link :type="'transaction'" :hash="contract.creationTransaction.hash" />
                                    </span>
                                    <span v-else class="ml-2">N/A</span>
                                </v-col>

                                <v-col cols="6">
                                    <small>Deployed By</small><br>
                                    <span v-if="contract.creationTransaction" class="ml-2">
                                        <Hash-Link :type="'address'" :hash="contract.creationTransaction.from" />
                                    </span>
                                    <span v-else class="ml-2">N/A</span>
                                </v-col>
                            </v-row>
                        </v-card-text>
                    </v-card>
                </v-col>
            </v-row>

            <v-chip-group :selected-class="`text-${contrastingColor}`" v-model="tabModel">
                <v-chip size="small" value="transactions">
                    Transactions 
                    <template v-if="!loadingStats">({{ totalTransactions }})</template>
                </v-chip>
                <v-chip size="small" value="internaltx">
                    Internal Transactions
                    <template v-if="!loadingStats">({{ addressTransactionStats.internalTransactionCount }})</template>
                </v-chip>
                <v-chip size="small" value="transfers">
                    Token Transfers 
                    <template v-if="!loadingStats">({{ totalTokenTransfers }})</template>
                </v-chip>
                <v-chip size="small" value="erc20Balances">ERC-20 Tokens</v-chip>
                <v-chip size="small" value="erc721Balances">ERC-721 Tokens</v-chip>
                <v-chip size="small" value="interactions" v-if="contract">Read / Write</v-chip>
                <v-chip size="small" value="code" v-if="contract">Code</v-chip>
                <v-chip size="small" value="logs" v-if="contract">Logs</v-chip>
            </v-chip-group>

            <div v-show="tab === 'transactions'">
                <v-card>
                    <Address-Transactions-List :address="address" :key="address" />
                </v-card>
            </div>

            <div v-show="tab === 'internaltx'">
                <v-card>
                    <AddressTraceSteps :address="address" :key="address" />
                </v-card>
            </div>

            <div v-show="tab === 'transfers'">
                <v-card>
                    <Address-Token-Transfers
                        :address="address"
                        :key="address" 
                        :erc20-count="patternCount.erc20"
                        :erc721-count="patternCount.erc721"
                        :erc1155-count="patternCount.erc1155"
                    />
                </v-card>
            </div>

            <div v-show="tab === 'erc20Balances'">
                <Token-Balances :address="address" :patterns="['erc20']" :key="address" />
            </div>

            <div v-show="tab === 'erc721Balances'">
                <Token-Balances :address="address" :patterns="['erc721']" :dense="true" :key="address" />
            </div>

            <template v-if="contract">
                <div v-show="tab === 'interactions'">
                    <Contract-Interaction :address="address" :key="address" />
                </div>

                <div v-show="tab === 'code'">
                    <Contract-Code v-if="contract" :contract="contract" :key="address" />
                </div>

                <div v-show="tab === 'logs'">
                    <v-card>
                        <v-card-text>
                            <Contract-Logs :address="address" :key="address" />
                        </v-card-text>
                    </v-card>
                </div>
            </template>
        </template>
    </v-container>
</template>

<script setup>
import { ref, computed, watch, onMounted, inject } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { formatContractPattern, getBestContrastingColor, formatNumber } from '../lib/utils';
import { useCurrentWorkspaceStore } from '../stores/currentWorkspace';
import { useTheme } from 'vuetify';

import AddressTransactionsList from './AddressTransactionsList.vue';
import AddressTokenTransfers from './AddressTokenTransfers.vue';
import AddressTraceSteps from './AddressTraceSteps.vue';
import TokenBalances from './TokenBalances.vue';
import ContractInteraction from './ContractInteraction.vue';
import ContractCode from './ContractCode.vue';
import ContractLogs from './ContractLogs.vue';
import HashLink from './HashLink.vue';

// Props
const props = defineProps(['address']);

// Injected services
const server = inject('$server');
const fromWei = inject('$fromWei');
const dt = inject('$dt');
// Router
const route = useRoute();
const router = useRouter();

// Store
const currentWorkspaceStore = useCurrentWorkspaceStore();

// Reactive state
const balance = ref(0);
const loadingBalance = ref(true);
const loadingContract = ref(true);
const loadingStats = ref(true);
const contract = ref(null);
const addressTransactionStats = ref({});

// Computed properties
const isErc20 = computed(() => 
    contract.value && 
    contract.value.patterns && 
    contract.value.patterns.indexOf('erc20') > -1
);

const isErc721 = computed(() => 
    contract.value && 
    contract.value.patterns && 
    contract.value.patterns.indexOf('erc721') > -1
);

const totalTransactions = computed(() => {
    if (!addressTransactionStats.value.sent && !addressTransactionStats.value.received) return 0;
    return formatNumber(addressTransactionStats.value.sent + addressTransactionStats.value.received, { short: true });
});

const totalTokenTransfers = computed(() => {
    if (!addressTransactionStats.value.tokenTransferCount) return 0;
    return formatNumber(addressTransactionStats.value.tokenTransferCount, { short: true });
});

const patternCount = computed(() => {
    return {
        erc20: addressTransactionStats.value ? addressTransactionStats.value.erc20_sent + addressTransactionStats.value.erc20_received : 0,
        erc721: addressTransactionStats.value ? addressTransactionStats.value.erc721_sent + addressTransactionStats.value.erc721_received : 0,
        erc1155: addressTransactionStats.value ? addressTransactionStats.value.erc1155_sent + addressTransactionStats.value.erc1155_received : 0
    }
});

const tab = computed({
    get() {
        return route.query.tab;
    },
    set(value) {
        router.replace({ query: { ...route.query, tab: value } }).catch(() => {});
    }
});

// Add for chip group styling
const contrastingColor = computed(() => {
    const theme = useTheme();
    return getBestContrastingColor('#4242421f', theme.current.value.colors);
});

// Add tabModel for v-chip-group that syncs with tab computed property
const tabModel = computed({
    get() {
        return tab.value || 'transactions';
    },
    set(value) {
        tab.value = value;
    }
});

// Methods
const loadContractData = (address) => {
    server.getContract(address)
        .then(({ data }) => contract.value = data)
        .catch(console.log)
        .finally(() => loadingContract.value = false);

    server.getAddressStats(address)
        .then(({ data }) => addressTransactionStats.value = data || {})
        .catch(console.log)
        .finally(() => loadingStats.value = false);
};

// Lifecycle hooks
onMounted(() => {
    server.getNativeTokenBalance(props.address)
        .then(({ data: { balance: balanceValue }}) => balance.value = balanceValue || 0)
        .finally(() => loadingBalance.value = false);
});

// Watchers
watch(() => props.address, (address) => {
    loadContractData(address);
}, { immediate: true });
</script>
