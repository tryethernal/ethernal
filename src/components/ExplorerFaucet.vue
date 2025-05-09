<template>
    <v-container fluid>
        <template v-if="faucet">
            <v-row>
                <v-col align="center">
                    <v-icon style="opacity: 0.25;" size="150" color="primary-lighten-1">mdi-faucet</v-icon>
                </v-col>
            </v-row>
            <v-row justify="center" align="center" class="mb-10 my-0">
                <v-col md="6" sm="12">
                    <v-card class="rounded-card rounded-xl pa-12" v-if="faucet">
                        <v-card-title class="text-primary d-flex justify-center align-center">{{ explorerStore.name }} Faucet - Get {{ tokenSymbol }} Tokens</v-card-title>
                        <v-card-text class="pb-0">
                            <v-alert text type="error" v-if="errorMessage" v-html="errorMessage"></v-alert>
                            <v-alert text type="success" v-if="transactionHash">Tokens sent successfully! <Hash-Link :type="'transaction'" :hash="transactionHash" :customLabel="'See transaction'" /></v-alert>
                            <v-form @submit.prevent="requestTokens()" v-model="valid">
                                <v-text-field
                                    prepend-inner-icon="mdi-wallet-outline"
                                    class="mt-1"
                                    density="compact"
                                    name="address"
                                    variant="outlined"
                                    required
                                    :rules="[
                                        v => !!v || 'A valid address is required',
                                        v => !!v && v.match(/(\b0x[A-Fa-f0-9]{40}\b)/g) ? true : 'Invalid address'
                                    ]"
                                    type="text"
                                    v-model="address"
                                    label="Wallet Address"></v-text-field>
                                <v-card-actions class="mb-5 justify-center">
                                    <v-btn variant="flat" :loading="loading" :disabled="!valid" type="submit">Request Tokens</v-btn>
                                </v-card-actions>
                            </v-form>
                            <template v-if="orderedRequests.length">
                                Your Addresses:
                                <ul>
                                    <li v-for="(request, idx) in slicedRequests" :key="idx">
                                        <Hash-Link :withName="false" :type="'address'" :hash="request.address" /> -
                                        <span v-if="durationUntilNextRequest(request.availableAt) <= 0" class="text-success">
                                            <a class="underlined" @click.prevent="requestFor(request.address)">Request now</a>
                                        </span>
                                        <span v-else>Request in {{ humanizeDuration(request.availableAt) }}</span>
                                    </li>
                                </ul>
                                <template v-if="orderedRequests.length > 5">
                                    <small v-if="!showAllRequests"><a @click.prevent="showAllRequests = !showAllRequests">[+] See More</a></small>
                                    <small v-else><a @click.prevent="showAllRequests = !showAllRequests">[-] See Less</a></small>
                                </template>
                                <v-divider class="my-4"></v-divider>
                            </template>
                            <small>
                                Max Frequency: {{ formattedAmount }} {{ tokenSymbol }} per address {{ formattedFrequency }}.<br>
                                Faucet Balance: <template v-if="balance">{{ $fromWei(balance, 'ether', tokenSymbol) }}</template><i v-else>Fetching...</i><br>
                                Faucet Address: <Hash-Link :withName="false" :type="'address'" :hash="faucet.address" :fullHash="true" />
                            </small>
                        </v-card-text>
                    </v-card>
                </v-col>
            </v-row>
            <v-row>
                <v-col>
                    <h4>Analytics</h4>
                    <Explorer-Faucet-Analytics :id="faucet.id" />
                </v-col>
            </v-row>
            <v-row>
                <v-col>
                    <h4>History</h4>
                    <Explorer-Faucet-Transaction-History :id="faucet.id" />
                </v-col>
            </v-row>
        </template>
        <template v-else-if="isAdmin">
            <v-card>
                <Create-Explorer-Faucet-Modal ref="createExplorerFaucetModal" />
                <v-card-text>
                    <v-row>
                        <v-col align="center">
                            <v-icon style="opacity: 0.25;" size="200" color="primary-lighten-1">mdi-faucet</v-icon>
                        </v-col>
                    </v-row>
                    <v-row>
                        <v-spacer></v-spacer>
                        <v-col cols="6" class="text-body-1">
                            Setup your faucet in two easy steps:
                            <ol>
                                <li>Enter the drip amount, and the interval between requests.</li>
                                <li>Top-up your assigned faucet address with test tokens.</li>
                            </ol>
                            <br>
                            Having a faucet integrated in your explorer will make it easier for your users to
                            request test tokens, and save you time by having one less tool to build & maintain.
                        </v-col>
                        <v-spacer></v-spacer>
                    </v-row>
                </v-card-text>
                <v-card-actions class="mb-4">
                    <v-spacer></v-spacer>
                    <v-btn variant="flat" :loading="loading" color="primary" @click="openCreateExplorerFaucetModal">Setup your Faucet</v-btn>
                    <v-spacer></v-spacer>
                </v-card-actions>
            </v-card>
        </template>
        <template v-else>
            <v-card>
                <v-card-text>
                    <v-row>
                        <v-col align="center">
                            <v-icon style="opacity: 0.25;" size="200" color="primary-lighten-1">mdi-faucet</v-icon>
                        </v-col>
                    </v-row>
                    <v-row>
                        <v-spacer></v-spacer>
                        <v-col cols="6" class="text-body-1">
                            No faucet has been setup here, but it's possible to!<br>
                            Reach out to the organization or individual that gave you access to this
                            explorer and ask them to setup the faucet on Ethernal.
                        </v-col>
                        <v-spacer></v-spacer>
                    </v-row>
                </v-card-text>
            </v-card>
        </template>
    </v-container>
</template>

<script>
import * as ethers from 'ethers';
const moment = require('moment');
import { mapStores, storeToRefs } from 'pinia';
import { useExplorerStore } from '../stores/explorer';
import { useEnvStore } from '../stores/env';
import ExplorerFaucetAnalytics from './ExplorerFaucetAnalytics.vue';
import ExplorerFaucetTransactionHistory from './ExplorerFaucetTransactionHistory.vue';
import CreateExplorerFaucetModal from './CreateExplorerFaucetModal.vue';
import HashLink from './HashLink.vue';

export default{
    name: 'ExplorerFaucet',
    components: {
        HashLink,
        ExplorerFaucetAnalytics,
        ExplorerFaucetTransactionHistory,
        CreateExplorerFaucetModal
    },
    data: () => ({
        loading: false,
        valid: true,
        errorMessage: null,
        address: null,
        balance: null,
        transactionHash: null,
        pusherUnsubscribe: null,
        requests: [],
        showAllRequests: false
    }),
    setup() {
        const explorerStore = useExplorerStore();
        const envStore = useEnvStore();

        const { id, faucet, token } = storeToRefs(explorerStore);
        const { isAdmin } = storeToRefs(envStore);

        return { faucet, isAdmin, explorerToken: token, explorerId: id };
    },
    mounted() {
        if (!this.faucet)
            return;

        this.initializeFaucet();
    },
    destroyed() {
        if (this.pusherUnsubscribe)
            this.pusherUnsubscribe();
    },
    methods: {
        initializeFaucet() {
            this.refreshFaucetBalance();

            this.pusherUnsubscribe = this.$pusher.onNewTransaction(data => {
                if (data.from == this.faucet.address || data.to == this.faucet.address)
                    this.refreshFaucetBalance();
            }, this);

            this.initializeRequests();
            if (this.orderedRequests.length)
                this.address = this.orderedRequests[this.orderedRequests.length - 1].address;
        },
        openCreateExplorerFaucetModal() {
            this.$refs.createExplorerFaucetModal.open({
                explorerId: this.explorerId,
                token: this.explorerToken || 'ETH'
            })
            .then(faucet => {
                if (faucet) {
                    const explorerStore = useExplorerStore();
                    explorerStore.updateExplorer({ faucet });
                    this.faucet = faucet;
                    this.initializeFaucet();
                }
            })
        },
        requestFor(address) {
            this.address = address;
            this.requestTokens();
        },
        refreshFaucetBalance() {
            this.$server.getFaucetBalance(this.faucet.id)
                .then(({ data }) => this.balance = data.balance)
                .catch(console.log);
        },
        requestTokens(address) {
            this.loading = true;
            this.transactionHash = null;
            this.errorMessage = false;
            this.$server.requestFaucetToken(this.faucet.id, address || this.address)
                .then(({ data }) => {
                    this.transactionHash = data.hash;
                    this.updateRequests({ address: this.address.toLowerCase(), availableAt: moment().add(data.cooldown, 'minutes').toDate() });
                })
                .catch(error => {
                    console.log(error)
                    this.errorMessage = error.response && error.response.data || 'Error while requesting tokens. Please retry.';
                })
                .finally(() => this.loading = false);
        },
        updateRequests(newRequest) {
            try {
                const newRequests = [];
                for (let i = 0; i < this.requests.length; i++) {
                    const request = this.requests[i];
                    if (request.address != this.address.toLowerCase())
                        newRequests.push(request)
                }
                newRequests.push(newRequest);
                this.requests = newRequests;
                localStorage.setItem('requests', JSON.stringify(this.requests));
            } catch(error) {
                console.log(error)
                return;
            }
        },
        initializeRequests() {
            try {
                this.requests = JSON.parse(localStorage.getItem('requests')) || [];
            } catch(error) {
                console.log(error)
                return [];
            }
        },
        durationUntilNextRequest(until) {
            return moment.duration(moment(until).diff(moment()), 'milliseconds');
        },
        humanizeDuration(until) {
            return this.durationUntilNextRequest(until).humanize();
        }
    },
    computed: {
        ...mapStores(useExplorerStore, useEnvStore),
        isFaucetEmpty() {
            if (!this.balance)
                return null;

            return ethers.BigNumber.from(this.balance).isZero();
        },
        isFaucetAlmostEmpty() {
            if (!this.balance)
                return null;

            return !this.isFaucetEmpty && ethers.BigNumber.from(this.balance).lt(ethers.BigNumber.from(this.faucet.amount));
        },
        slicedRequests() {
            return this.showAllRequests ? this.orderedRequests : this.orderedRequests.slice(0, 5);
        },
        orderedRequests() {
            const copy = this.requests;
            return copy.sort((a, b) => a.cooldown - b.cooldown);
        },
        tokenSymbol() {
            return this.explorerStore.token || 'ETH';
        },
        formattedAmount() {
            return ethers.utils.formatUnits(this.faucet.amount);
        },
        formattedFrequency() {
            const roundedMinutes = Math.round(this.faucet.interval);
            const totalHours = roundedMinutes / 60;
            const totalDays = totalHours / 24;

            let result = "every ";

            if (totalDays >= 1) {
                const roundedDays = Math.round(totalDays * 2) / 2;
                const dayPart = Math.floor(roundedDays);
                const halfDay = roundedDays % 1 === 0.5;

                result += `${dayPart > 1 ? dayPart : dayPart === 1 ? "" : ""} day${dayPart > 1 || dayPart === 0 ? 's' : ''}`;
                if (halfDay) {
                    result += " and a half";
                }
            } else if (totalHours >= 1) {
                const roundedHours = Math.round(totalHours * 2) / 2;
                const hourPart = Math.floor(roundedHours);
                const halfHour = roundedHours % 1 === 0.5;

                result += `${hourPart > 1 ? hourPart : hourPart === 1 ? "" : ""} hour${hourPart > 1 || hourPart === 0 ? 's' : ''}`;
                if (halfHour) {
                    result += " and a half";
                } else {
                    const remainingMinutes = roundedMinutes % 60;
                    if (remainingMinutes > 0) {
                        result += ` and ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}`;
                    }
                }
            } else {
                result += `${roundedMinutes} minute${roundedMinutes > 1 ? 's' : ''}`;
            }

            return result;
        }
    }
}
</script>
