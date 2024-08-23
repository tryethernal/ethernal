<template>
    <v-dialog v-model="dialog" max-width="400" content-class="roundedModal">
        <v-card outlined>
            <v-card-title class="mb-4">
                Select a token
            </v-card-title>
            <v-card-text class="px-0">
                <v-text-field
                    dense
                    class="rounded-xl px-6"
                    placeholder="Search name or paste address"
                    hide-details="auto"
                    persistent-placeholder
                    outlined
                    v-model="filter">
                    <template v-slot:append>
                        <div class="py-6"></div>
                    </template>
                </v-text-field>
                <v-divider class="my-6 mx-1"></v-divider>
                <template v-if="orderedTokens.length">
                    <div class="d-flex justify-space-between px-6">
                        <span>Token Name</span>
                    </div>
                    <v-list-item :class="{ 'oppositeToken': oppositeTokenAddress == token.address }" @click="close(token)" class="px-6" link v-for="(token, idx) in orderedTokens" :key="idx">
                        <v-list-item-icon class="mr-3">
                            <v-icon>mdi-alpha-t-circle</v-icon>
                        </v-list-item-icon>
                        <v-list-item-content>
                            <v-list-item-title>
                                {{ token.tokenSymbol }}
                                <span class="float-right">
                                    {{ BNtoSignificantDigits(balances[token.address]) }}
                                </span>
                            </v-list-item-title>
                            <v-list-item-subtitle v-if="token.address != nativeTokenAddress">
                                <Hash-Link :contract="{ tokenName: token.tokenName, tokenSymbol: token.tokenSymbol }" :type="'address'" :hash="token.address" :notCopiable="true" :unlink="true" />
                            </v-list-item-subtitle>
                        </v-list-item-content>
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
import { mapGetters } from 'vuex';
const { BNtoSignificantDigits } = require('@/lib/utils');
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
        ...mapGetters([
            'user',
            'nativeTokenAddress'
        ]),
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
            return this.filteredTokens.toSorted((a, b) => {
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
