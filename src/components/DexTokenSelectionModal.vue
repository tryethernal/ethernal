<template>
    <v-dialog v-model="dialog" max-width="400" content-class="roundedModal">
        <v-card>
            <v-card-title class="mb-4">
                Select a token
            </v-card-title>
            <v-card-text class="px-0">
                <v-text-field
                    density="compact"
                    class="rounded-xl px-6"
                    placeholder="Search name or paste address"
                    hide-details="auto"
                    persistent-placeholder
                    variant="outlined"
                    v-model="filter">
                    <template v-slot:append>
                        <div class="py-6"></div>
                    </template>
                </v-text-field>
                <v-divider class="mt-6 mb-3 mx-1"></v-divider>
                <template v-if="orderedTokens.length">
                    <v-list-item prepend-icon="mdi-alpha-t-circle" :class="{ 'oppositeToken': oppositeTokenAddress == token.address }" @click="close(token)" class="px-6 pb-4" link v-for="(token, idx) in orderedTokens" :key="idx">
                        <template v-slot:title>
                            {{ token.tokenSymbol }}
                            <span class="float-right">
                                {{ BNtoSignificantDigits(balances[token.address]) }}
                            </span>
                        </template>
                        <template v-slot:subtitle>
                            <Hash-Link :contract="{ tokenName: token.tokenName, tokenSymbol: token.tokenSymbol }" :type="'address'" :hash="token.address" :notCopiable="true" :unlink="true" />
                        </template>
                    </v-list-item>
                </template>
                <div class="text-center" v-else>
                    No tokens available.
                </div>
            </v-card-text>
        </v-card>
    </v-dialog>
</template>
<script>
const ethers = require('ethers');
import { useEnvStore } from '@/stores/env';

import { BNtoSignificantDigits } from '@/lib/utils';
import HashLink from './HashLink.vue';

export default {
    name: 'DexTokenSelectionMoodal',
    components: {
        HashLink
    },
    data: () => ({
        loading: false,
        dialog: false,
        resolve: null,
        reject: null,
        filter: null,
        tokens: [],
        balances: {},
        refreshOrder: 0,
        oppositeTokenAddress: null,
    }),
    setup() {
        const { nativeTokenAddress} = useEnvStore();
        return { nativeTokenAddress };
    },
    methods: {
        BNtoSignificantDigits,
        open(options) {
            this.dialog = true;
            this.valid = false;
            this.loading = false;
            this.tokens = options.tokens;
            this.oppositeTokenAddress = options.oppositeTokenAddress;
            this.balances = options.balances;

            return new Promise((resolve, reject) => {
                this.resolve = resolve;
                this.reject = reject;
            });
        },
        close(token) {
            this.resolve(token);
            this.reset();
        },
        reset() {
            this.resolve = null;
            this.reject = null;
            this.dialog = false;
            this.loading = false;
            this.tokens = [];
        }
    },
    computed: {
        filteredTokens() {
            if (!this.filter)
                return this.tokens;

            return this.tokens.filter(t => {
                return t.address.toLowerCase() == this.filter.toLowerCase() ||
                    t.tokenName.toLowerCase().includes(this.filter.toLowerCase()) ||
                    t.tokenSymbol.toLowerCase().includes(this.filter.toLowerCase())
            }, this);
        },
        orderedTokens() {
            this.refreshOrder;
            return [...this.filteredTokens].sort((a, b) => {
                const balanceA = ethers.BigNumber.from(this.balances[a.address] || '0');
                const balanceB = ethers.BigNumber.from(this.balances[b.address] || '0');

                if (balanceA.lt(balanceB))
                    return 1;
                else if (balanceB.lt(balanceA))
                    return -1;
                return 0;
            });
        }
    }
}
</script>
<style scoped>
.oppositeToken {
    opacity: 0.5;
}
</style>
