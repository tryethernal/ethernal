<template>
    <div>
        <v-card outlined class="mb-4">
            <v-skeleton-loader v-if="loading" class="col-4" type="list-item-three-line"></v-skeleton-loader>
            <div v-else>
                <v-card-text>
                    <v-alert dense type="info" text class="mb-5" v-if="!accounts.length && isUserAdmin">
                        To call contracts with loaded accounts, go to the "Accounts" tab and sync them from your chain, or add them using a private key or the impersonification feature.
                    </v-alert>
                    <div class="mb-5" v-if="accounts.length">
                        Call Contract With: <a :class="{ underlined: mode != 'accounts' }" @click="mode = 'accounts'">Loaded Accounts</a> | <a :class="{ underlined: mode != 'metamask' }" @click="mode = 'metamask'">Metamask</a>
                    </div>
                    <Metamask v-if="displayMetamask" @rpcConnectionStatusChanged="onRpcConnectionStatusChanged"></Metamask>
                    <v-row v-else>
                        <v-col cols="5">
                            <v-select
                                outlined
                                dense
                                label="Select from address"
                                v-model="from"
                                item-text="address"
                                :items="accounts"
                                return-object>
                                <template v-slot:item="{ item }">
                                    <v-icon small class="mr-1" v-if="item.privateKey">mdi-lock-open-outline</v-icon>
                                    {{ item.address }}
                                </template>
                                <template v-slot:selection="{ item }">
                                    <v-icon small class="mr-1" v-if="item.privateKey">mdi-lock-open-outline</v-icon>
                                    {{ item.address }}
                                </template>
                            </v-select>
                            <v-text-field
                                outlined
                                dense
                                type="number"
                                v-model="gasPrice"
                                label="Gas Price (wei)">
                            </v-text-field>
                            <v-text-field
                                outlined
                                dense
                                type="number"
                                hide-details="auto"
                                v-model="gasLimit"
                                label="Maximum Gas">
                            </v-text-field>
                        </v-col>
                    </v-row>
                </v-card-text>
            </div>
        </v-card>
    </div>
</template>
<script>
import { mapGetters } from 'vuex';
import Metamask from './Metamask';

export default {
    name: 'ContractCallOptions',
    props: ['accounts', 'loading'],
    components: {
        Metamask
    },
    data: () => ({
        from: null,
        gasLimit: '100000',
        gasPrice: null,
        mode: 'accounts'
    }),
    mounted() {
        if (!this.accounts.length)
            return this.mode = 'metamask';

        this.gasLimit = this.currentWorkspace.gasLimit;
        this.gasPrice = this.currentWorkspace.gasPrice;
        if (this.currentWorkspace.defaultAccount) {
            console.log(this.currentWorkspace.defaultAccount)
            for (let i = 0; i < this.accounts.length; i++)
                if (this.accounts[i].address == this.currentWorkspace.defaultAccount)
                    this.from = this.accounts[i];
        }
        else
            this.from = this.accounts[0];

        this.$emit('rpcConnectionStatusChanged', { isReady: true, account: this.from.address });
    },
    methods: {
        onRpcConnectionStatusChanged(data) {
            this.$emit('rpcConnectionStatusChanged', data);
        }
    },
    watch: {
        mode() {
            this.$emit('senderSourceChanged', this.mode);
        }
    },
    computed: {
        ...mapGetters([
            'currentWorkspace',
            'isPublicExplorer',
            'isUserAdmin'
        ]),
        displayMetamask() {
            return this.mode === 'metamask';
        }
    }
}
</script>
<style scoped>
.underlined {
    text-decoration: underline;
}
</style>
