<template>
    <v-container>
        <v-row>
            <v-col cols="12">
                <h2>Block {{ block.number }}</h2>
            </v-col>
        </v-row>
        <v-row class="mb-4">
            <v-col cols="2">
                <v-subheader class="text-overline">Gas Limit</v-subheader>
                {{ block.gasLimit.toLocaleString() }}
            </v-col>
            <v-divider vertical></v-divider>
            <v-col cols="2">
                <v-subheader class="text-overline">Mined On</v-subheader>
                {{ block.timestamp | moment('YYYY-MM-DD hh:mm:ss') }}
            </v-col>
            <v-divider vertical></v-divider>
            <v-col cols="2">
                <v-subheader class="text-overline">Hash</v-subheader>
                {{ block.hash }}
            </v-col>
        </v-row>
        <h3>Transactions</h3>
        <v-row class="my-2 grey lighten-3" v-for="tx in transactions" :key="tx.hash">
            <v-col cols="12">
                <v-row>
                    <v-col>
                        <div class="text-overline">
                            <strong>Tx Hash</strong>
                        </div>
                        <div>
                            <Hash-Link :type="'transaction'" :hash="tx.hash" :fullHash="true" />
                        </div>
                    </v-col>
                </v-row>
                <v-row>
                    <v-col cols="4">
                        <div class="text-overline">
                            <strong>From</strong>
                        </div>
                        <div><Hash-Link :type="'address'" :hash="tx.from" :fullHash="true" /></div>
                    </v-col>
                    <v-col cols="4">
                        <div class="text-overline">
                            <strong>To</strong>
                        </div>
                        <div><Hash-Link :type="'address'" :hash="tx.to" :fullHash="true" /></div>
                    </v-col>
                </v-row>
                <v-row>
                    <v-col cols="2">
                        <div class="text-overline">
                            <strong>Gas Used</strong>
                        </div>
                        <div>{{ tx.receipt.gasUsed.toLocaleString() }}</div>
                    </v-col>
                    <v-col cols="2">
                        <div class="text-overline">
                            <strong>Value</strong>
                        </div>
                        <div>{{ tx.value.toLocaleString() }}</div>
                    </v-col>
                </v-row>
            </v-col>
            <v-divider></v-divider>
        </v-row>
    </v-container>
</template>

<script>
import HashLink from './HashLink';

export default {
    name: 'Block',
    props: ['number'],
    components: {
        HashLink
    },
    data: () => ({
        block: {
            gasLimit: 0
        },
        transactions: []
    }),
    watch: {
        number: {
            immediate: true,
            handler(number) {
                this.$bind('block', this.db.collection('blocks').doc(number));
                this.$bind('transactions', this.db.collection('transactions').where('blockNumber', '==', parseInt(number)));
            }
        }
    }
}
</script>
