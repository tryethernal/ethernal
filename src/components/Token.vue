<template>
    <v-container fluid>
        <h4>Balance</h4>
        <v-card outlined class="mb-4">
            <v-card-text>
                <v-row>
                    <v-col cols="5">
                        <v-select
                            outlined
                            dense
                            label="Select from address"
                            v-model="callOptions.from"
                            :item-text="'id'"
                            :items="accounts">
                            <template v-slot:item="{ item }">
                                <v-icon small class="mr-1" v-if="item.privateKey">mdi-lock-open-outline</v-icon>
                                {{ item.id }}
                            </template>
                            <template v-slot:selection="{ item }">
                                <v-icon small class="mr-1" v-if="item.privateKey">mdi-lock-open-outline</v-icon>
                                {{ item.id }}
                            </template>
                        </v-select>
                        <v-btn :loading="loading" class="mt-1" depressed color="primary" @click="fetchBalance()">Check</v-btn>
                    </v-col>
                </v-row>
            </v-card-text>
        </v-card>
    </v-container>
</template>
<script>
import { mapGetters } from 'vuex';

export default {
    name: 'Token',
    props: ['address', 'contract'],
    data: () => ({
        accounts: [],
        callOptions: {
            from: null
        },
        loading: false
    }),
    methods: {
        fetchBalance: function() {
            this.loading = true;
            this.server.callContractReadMethod(
                this.contract,
                'balanceOf(address)',
                this.callOptions,
                { 0: this.callOptions.from },
                this.currentWorkspace.rpcServer
            )
            .then(res => {
                console.log(res);
            })
            .finally(() => this.loading = false);
        }
    },
    mounted: function() {
        this.$bind('accounts', this.db.collection('accounts'))
            .then(() => this.callOptions.from = this.currentWorkspace.settings.defaultAccount);
    },
    computed: {
        ...mapGetters([
            'currentWorkspace'
        ])
    }
}
</script>
