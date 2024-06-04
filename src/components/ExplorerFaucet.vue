<template>
    <v-container fluid>
        <v-row justify="center" align="center">
            <v-col md="6" sm="12">
                <v-card outlined class="rounded-card d-flex flex-column align-center justify-center">
                    <v-card-title>Get {{ tokenSymbol }} Tokens</v-card-title>
                    <v-card-text class="pb-0">
                        <v-alert text type="error" v-if="errorMessage" v-html="errorMessage"></v-alert>
                        <v-alert text type="success" v-if="transactionHash">Tokens sent successfully! <Hash-Link :type="'transaction'" :hash="transactionHash" :customLabel="'See transaction'" /></v-alert>.
                        <v-form @submit.prevent="requestTokens()" v-model="valid">
                            <v-text-field
                                class="mt-1"
                                dense
                                name="address"
                                outlined
                                required
                                :rules="[
                                    v => !!v || 'An address is required',
                                    v => !!v && v.match(/(\b0x[A-Fa-f0-9]{40}\b)/g) ? true : 'Invalid address'
                                ]"
                                type="text"
                                v-model="address"
                                label="Wallet Address"></v-text-field>
                            <v-card-actions class="mb-5 justify-center">
                                <v-btn :loading="loading" color="primary" :disabled="!valid" type="submit">Request Tokens</v-btn>
                            </v-card-actions>
                        </v-form>
                        <small>
                            Max Frequency: {{ publicExplorer.faucet.amount }} CAGA, per address, {{ formattedFrequency }}.<br>
                            Faucet Balance: <template v-if="balance">{{ balance | fromWei('ether', publicExplorer.token) }}</template><i v-else>Fetching...</i><br>
                            Faucet Address: <Hash-Link :type="'address'" :hash="publicExplorer.faucet.address" />
                        </small>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
const moment = require('moment');
import { mapGetters } from 'vuex';
import HashLink from './HashLink';
import FromWei from '../filters/FromWei.js';

export default{
    name: 'ExplorerFaucet',
    components: {
        HashLink
    },
    filters: {
        FromWei
    },
    data: () => ({
        loading: false,
        valid: true,
        errorMessage: null,
        address: null,
        balance: null,
        transactionHash: null
    }),
    mounted() {
        this.server.getFaucetBalance(this.publicExplorer.faucet.id)
            .then(({ data }) => this.balance = data.balance)
            .catch(console.log);
    },
    methods: {
        requestTokens() {
            this.loading = true;
            this.transactionHash = null;
            this.errorMessage = false;
            this.server.requestFaucetToken(this.publicExplorer.faucet.id, this.address)
                .then(({ data }) => this.transactionHash = data.hash)
                .catch(error => {
                    this.errorMessage = error.response && error.response.data || 'Error while requesting tokens. Please retry.';
                })
                .finally(() => this.loading = false);
        }
    },
    computed: {
        ...mapGetters([
            'publicExplorer'
        ]),
        tokenSymbol() {
            return this.publicExplorer.token || 'ETH';
        },
        formattedCooldown() {
            return moment.duration(this.publicExplorer.faucet.interval, 'hours').asHours();
        },
        formattedFrequency() {
            const hours = this.publicExplorer.faucet.interval;
            const roundedHours = Math.round(hours * 2) / 2;
            // Calculate the total minutes based on the rounded hours
            const totalMinutes = roundedHours * 60;
            const days = Math.floor(totalMinutes / (24 * 60));
            const remainingMinutesAfterDays = totalMinutes % (24 * 60);
            const displayHours = Math.floor(remainingMinutesAfterDays / 60);
            const minutes = remainingMinutesAfterDays % 60;

            let result = "every ";

            if (days > 0) {
                result += `${days > 1 ? days : ''} day${days > 1 ? 's' : ''}`;
                if (remainingMinutesAfterDays >= 720) { // 720 minutes is 12 hours, i.e., half a day
                    result += " and a half";
                }
            } else if (displayHours > 0) {
                result += `${displayHours > 1 ? displayHours : ''} hour${displayHours > 1 ? 's' : ''}`;
                if (minutes >= 30) { // 30 minutes is half an hour
                    result += " and a half";
                }
            } else if (minutes > 0) {
                result += `${minutes > 1 ? minutes : ''} minute${minutes > 1 ? 's' : ''}`;
            }

            return result;
        }
    }
}
</script>
